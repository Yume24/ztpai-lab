import { ConflictError, NotFoundError, ValidationError } from "../../errors/AppError.js";

const ReservationStatus = Object.freeze({ CONFIRMED: "CONFIRMED", CANCELLED: "CANCELLED" });

const ALLOWED_TRANSITIONS = {
    [ReservationStatus.CONFIRMED]: [ReservationStatus.CANCELLED],
    [ReservationStatus.CANCELLED]: []
};

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;

const bodyError = (field, message) => new ValidationError([{ location: "body", field, message }]);

// Przedziały półotwarte [start, end): A i B nakładają się <=> A.start < B.end && B.start < A.end
function overlaps(a, b) {
    return a.startTime.getTime() < b.endTime.getTime() && b.startTime.getTime() < a.endTime.getTime();
}

export class ReservationsService {
    constructor({ reservationsRepository, roomsRepository, now = () => new Date() }) {
        this.reservationsRepository = reservationsRepository;
        this.roomsRepository = roomsRepository;
        this.now = now;
    }

    async createReservation({ roomId, reservedBy, participants, startTime, endTime }) {
        const range = { startTime: new Date(startTime), endTime: new Date(endTime) };
        const duration = range.endTime.getTime() - range.startTime.getTime();

        if (duration <= 0) throw bodyError("endTime", "endTime must be later than startTime");
        if (duration < MIN_DURATION_MS) throw bodyError("endTime", "Reservation must last at least 15 minutes");
        if (duration > MAX_DURATION_MS) throw bodyError("endTime", "Reservation must last at most 8 hours");
        if (range.startTime.getTime() < this.now().getTime()) {
            throw bodyError("startTime", "startTime must not be in the past");
        }

        const room = await this.roomsRepository.getRoomById(roomId);
        if (!room) throw new NotFoundError("Room");

        if (participants > room.capacity) throw new ConflictError("Room capacity exceeded");

        const activeReservations = await this.reservationsRepository.findReservations({
            roomId,
            status: ReservationStatus.CONFIRMED
        });
        if (activeReservations.some(existing => overlaps(existing, range))) {
            throw new ConflictError("Room is already booked in the requested time range", "ROOM_ALREADY_BOOKED");
        }

        return this.reservationsRepository.createReservation({
            roomId,
            reservedBy,
            participants,
            ...range,
            status: ReservationStatus.CONFIRMED,
            createdAt: this.now(),
            cancelledAt: null,
            internalNote: "created via API v2"
        });
    }

    async listReservations(filters) {
        return this.reservationsRepository.findReservations(filters);
    }

    async cancelReservation(id) {
        const reservation = await this.reservationsRepository.getReservationById(id);
        if (!reservation) throw new NotFoundError("Reservation");

        if (reservation.status === ReservationStatus.CANCELLED) return reservation;

        const now = this.now();
        if (reservation.startTime.getTime() <= now.getTime()) {
            throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
        }

        if (!ALLOWED_TRANSITIONS[reservation.status].includes(ReservationStatus.CANCELLED)) {
            throw new ConflictError(`Cannot change status from ${reservation.status} to ${ReservationStatus.CANCELLED}`);
        }

        return this.reservationsRepository.updateReservation(id, {
            status: ReservationStatus.CANCELLED,
            cancelledAt: now
        });
    }
}
