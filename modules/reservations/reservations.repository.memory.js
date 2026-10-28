const time = value => new Date(value).getTime();

export class InMemoryReservationsRepository {
    constructor(store) {
        this.store = store;
    }

    #withRoom(reservation) {
        const room = this.store.rooms.get(reservation.roomId);
        const building = this.store.buildings.get(room.buildingId);
        return {
            ...reservation,
            room: { id: room.id, name: room.name, building: { id: building.id, name: building.name } }
        };
    }

    #matching({ roomId, buildingId, status, from, to } = {}) {
        return [...this.store.reservations.values()].filter(r =>
            (roomId === undefined || r.roomId === roomId) &&
            (buildingId === undefined || this.store.rooms.get(r.roomId)?.buildingId === buildingId) &&
            (status === undefined || r.status === status) &&
            (to === undefined || time(r.startTime) < time(to)) &&
            (from === undefined || time(r.endTime) > time(from))
        );
    }

    async createReservation(data) {
        const reservation = { ...data, id: Math.max(0, ...this.store.reservations.keys()) + 1 };
        this.store.reservations.set(reservation.id, reservation);
        return this.#withRoom(reservation);
    }

    async getReservationById(id) {
        const reservation = this.store.reservations.get(id);
        return reservation ? this.#withRoom(reservation) : null;
    }

    async findReservations(filters) {
        return this.#matching(filters)
            .sort((a, b) => time(a.startTime) - time(b.startTime) || a.id - b.id)
            .map(r => this.#withRoom(r));
    }

    async updateReservation(id, changes) {
        return this.#withRoom(Object.assign(this.store.reservations.get(id), changes));
    }
}
