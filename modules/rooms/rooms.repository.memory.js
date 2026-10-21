export class InMemoryRoomsRepository {
    constructor(seed = []) {
        this.state = new Map(seed.map(room => [room.id, structuredClone(room)]));
    }

    async getAllRooms() {
        return [...this.state.values()];
    }

    async getRoomById(id) {
        return this.state.get(id) ?? null;
    }
}
