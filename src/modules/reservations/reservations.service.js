import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../errors/AppError.js";
import { Role } from "../users/users.roles.js";

const ReservationStatus = Object.freeze({ CONFIRMED: "CONFIRMED", CANCELLED: "CANCELLED" });

const ALLOWED_TRANSITIONS = {
    [ReservationStatus.CONFIRMED]: [ReservationStatus.CANCELLED],
    [ReservationStatus.CANCELLED]: []
};

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const bodyError = (field, message) => new ValidationError([{ location: "body", field, message }]);

function overlaps(a, b) {
    return a.startTime.getTime() < b.endTime.getTime() && b.startTime.getTime() < a.endTime.getTime();
}

function canAccess(reservation, currentUser) {
    return currentUser.role === Role.ADMIN || reservation.userId === currentUser.id;
}

export class ReservationsService {
    constructor({ runInTransaction, now = () => new Date() }) {
        this.runInTransaction = runInTransaction;
        this.now = now;
    }

    async createReservation({ roomId, participants, startTime, endTime }, currentUser) {
        const range = { startTime: new Date(startTime), endTime: new Date(endTime) };
        const duration = range.endTime.getTime() - range.startTime.getTime();

        if (duration <= 0) throw bodyError("endTime", "endTime must be later than startTime");
        if (duration < MIN_DURATION_MS) throw bodyError("endTime", "Reservation must last at least 15 minutes");
        if (duration > MAX_DURATION_MS) throw bodyError("endTime", "Reservation must last at most 8 hours");
        if (range.startTime.getTime() < this.now().getTime()) {
            throw bodyError("startTime", "startTime must not be in the past");
        }

        return this.runInTransaction(async ({ roomsRepository, reservationsRepository }) => {
            const room = await roomsRepository.getRoomById(roomId);
            if (!room) throw new NotFoundError("Room");

            if (participants > room.capacity) throw new ConflictError("Room capacity exceeded", "CAPACITY_EXCEEDED");

            await roomsRepository.lockRoomById(roomId);

            const activeReservations = await reservationsRepository.findReservations({
                roomId,
                status: ReservationStatus.CONFIRMED,
                from: range.startTime,
                to: range.endTime
            });
            if (activeReservations.some(existing => overlaps(existing, range))) {
                throw new ConflictError("Room is already booked in the requested time range", "ROOM_ALREADY_BOOKED");
            }

            return reservationsRepository.createReservation({
                roomId,
                userId: currentUser.id,
                participants,
                ...range,
                status: ReservationStatus.CONFIRMED,
                createdAt: this.now(),
                cancelledAt: null,
                internalNote: "created via API v2"
            });
        });
    }

    async listReservations(query, currentUser) {
        const isAdmin = currentUser.role === Role.ADMIN;
        if (!isAdmin && query.userId !== undefined) {
            throw new ForbiddenError("Only ADMIN can filter reservations by userId");
        }
        const filters = isAdmin ? query : { ...query, userId: currentUser.id };

        return this.runInTransaction(async ({ reservationsRepository }) => {
            const { items, total } = await reservationsRepository.listReservations(filters);
            return {
                items,
                meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }
            };
        });
    }

    async getReservation(id, currentUser) {
        return this.runInTransaction(async ({ reservationsRepository }) => {
            const reservation = await reservationsRepository.getReservationById(id);
            if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");
            return reservation;
        });
    }

    async cancelReservation(id, currentUser) {
        return this.runInTransaction(async ({ reservationsRepository }) => {
            const reservation = await reservationsRepository.getReservationById(id);
            if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");

            if (reservation.status === ReservationStatus.CANCELLED) return reservation;

            const now = this.now();
            if (reservation.startTime.getTime() <= now.getTime()) {
                throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
            }

            if (!ALLOWED_TRANSITIONS[reservation.status].includes(ReservationStatus.CANCELLED)) {
                throw new ConflictError(`Cannot change status from ${reservation.status} to ${ReservationStatus.CANCELLED}`);
            }

            return reservationsRepository.updateReservation(id, {
                status: ReservationStatus.CANCELLED,
                cancelledAt: now
            });
        });
    }
}
