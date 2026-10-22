export class InMemoryReservationsRepository {
    constructor(seed = []) {
        this.state = new Map(seed.map(r => [r.id, structuredClone(r)]));
        this.nextId = Math.max(0, ...this.state.keys()) + 1;
    }

    async createReservation(data) {
        const reservation = { ...data, id: this.nextId++ };
        this.state.set(reservation.id, reservation);
        return reservation;
    }

    async getReservationById(id) {
        return this.state.get(id) ?? null;
    }

    async findReservations({ roomId, status } = {}) {
        return [...this.state.values()].filter(r =>
            (roomId === undefined || r.roomId === roomId) &&
            (status === undefined || r.status === status)
        );
    }

    async updateReservation(id, changes) {
        return Object.assign(this.state.get(id), changes);
    }
}
