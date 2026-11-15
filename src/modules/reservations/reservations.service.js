import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../errors/AppError.js";
import { noopEventBus } from "../../events/eventBus.js";
import { Role } from "../users/users.roles.js";
import { ReservationEvents } from "./reservations.events.js";
import { overlaps } from "./reservations.rules.js";

const ReservationStatus = Object.freeze({ CONFIRMED: "CONFIRMED", CANCELLED: "CANCELLED" });

const ALLOWED_TRANSITIONS = {
    [ReservationStatus.CONFIRMED]: [ReservationStatus.CANCELLED],
    [ReservationStatus.CANCELLED]: []
};

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const bodyError = (field, message) => new ValidationError([{ location: "body", field, message }]);
const toIso = value => new Date(value).toISOString();

function canAccess(reservation, currentUser) {
    return currentUser.role === Role.ADMIN || reservation.userId === currentUser.id;
}

export class ReservationsService {
    constructor({ runInTransaction, now = () => new Date(), eventBus = noopEventBus }) {
        this.runInTransaction = runInTransaction;
        this.now = now;
        this.eventBus = eventBus;
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

        const reservation = await this.runInTransaction(async ({ roomsRepository, reservationsRepository }) => {
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

        // runInTransaction kończy się po COMMIT. Gdy operacja się nie uda, wyjątek przerywa metodę przed publish.
        this.eventBus.publish(ReservationEvents.CREATED, {
            reservationId: reservation.id,
            roomId: reservation.roomId,
            userId: reservation.userId,
            startTime: toIso(reservation.startTime),
            endTime: toIso(reservation.endTime)
        });
        return reservation;
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
        const { reservation, cancelled } = await this.runInTransaction(async ({ reservationsRepository }) => {
            // Blokada wiersza: dwa równoległe anulowania nie zmienią statusu ani nie opublikują eventu dwa razy.
            await reservationsRepository.lockReservationById(id);
            const reservation = await reservationsRepository.getReservationById(id);
            if (!reservation || !canAccess(reservation, currentUser)) throw new NotFoundError("Reservation");

            if (reservation.status === ReservationStatus.CANCELLED) return { reservation, cancelled: false };

            const now = this.now();
            if (reservation.startTime.getTime() <= now.getTime()) {
                throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
            }

            if (!ALLOWED_TRANSITIONS[reservation.status].includes(ReservationStatus.CANCELLED)) {
                throw new ConflictError(`Cannot change status from ${reservation.status} to ${ReservationStatus.CANCELLED}`);
            }

            const updated = await reservationsRepository.updateReservation(id, {
                status: ReservationStatus.CANCELLED,
                cancelledAt: now
            });
            return { reservation: updated, cancelled: true };
        });

        // Ponowne anulowanie jest idempotentne: zwraca rezerwację bez zmian i nie publikuje eventu.
        if (cancelled) {
            this.eventBus.publish(ReservationEvents.CANCELLED, {
                reservationId: reservation.id,
                roomId: reservation.roomId,
                userId: reservation.userId,
                cancelledBy: currentUser.id
            });
        }
        return reservation;
    }
}
