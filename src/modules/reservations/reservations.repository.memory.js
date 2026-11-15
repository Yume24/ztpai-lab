import { ConflictError } from "../../errors/AppError.js";
import { overlaps } from "./reservations.rules.js";

const time = value => new Date(value).getTime();

export class InMemoryReservationsRepository {
    constructor(store) {
        this.store = store;
    }

    #withRelations(reservation) {
        const room = this.store.rooms.get(reservation.roomId);
        const building = this.store.buildings.get(room.buildingId);
        const user = this.store.users.get(reservation.userId);
        return {
            ...reservation,
            room: { id: room.id, name: room.name, building: { id: building.id, name: building.name } },
            user: { id: user.id, email: user.email }
        };
    }

    #matching({ roomId, buildingId, userId, status, from, to } = {}) {
        return [...this.store.reservations.values()].filter(r =>
            (roomId === undefined || r.roomId === roomId) &&
            (buildingId === undefined || this.store.rooms.get(r.roomId)?.buildingId === buildingId) &&
            (userId === undefined || r.userId === userId) &&
            (status === undefined || r.status === status) &&
            overlaps(r, { startTime: from ?? -Infinity, endTime: to ?? Infinity })
        );
    }

    async createReservation(data) {
        if (!this.store.rooms.has(data.roomId) || !this.store.users.has(data.userId)) {
            throw new ConflictError("Related resource does not exist or is still in use", "FOREIGN_KEY_VIOLATION");
        }

        const reservation = { ...data, id: Math.max(0, ...this.store.reservations.keys()) + 1 };
        this.store.reservations.set(reservation.id, reservation);
        return this.#withRelations(reservation);
    }

    async getReservationById(id) {
        const reservation = this.store.reservations.get(id);
        return reservation ? this.#withRelations(reservation) : null;
    }

    async findReservations(filters) {
        return this.#matching(filters)
            .sort((a, b) => time(a.startTime) - time(b.startTime) || a.id - b.id)
            .map(r => this.#withRelations(r));
    }

    async listReservations({ page, limit, sort, ...filters }) {
        const desc = sort.startsWith("-");
        const field = desc ? sort.slice(1) : sort;
        const direction = desc ? -1 : 1;

        const matching = this.#matching(filters)
            .sort((a, b) => (a[field] - b[field]) * direction || a.id - b.id);

        return {
            items: matching.slice((page - 1) * limit, page * limit).map(r => this.#withRelations(r)),
            total: matching.length
        };
    }

    async updateReservation(id, changes) {
        return this.#withRelations(Object.assign(this.store.reservations.get(id), changes));
    }
}
