import { ConflictError } from "../../errors/AppError.js";

export class InMemoryRoomsRepository {
    constructor(store) {
        this.store = store;
    }

    #withBuilding(room) {
        const building = this.store.buildings.get(room.buildingId);
        return { ...room, building: { id: building.id, name: building.name } };
    }

    async getAllRooms() {
        return [...this.store.rooms.values()].map(room => this.#withBuilding(room));
    }

    async getRoomById(id) {
        const room = this.store.rooms.get(id);
        return room ? this.#withBuilding(room) : null;
    }

    async getRoomsByBuildingId(buildingId) {
        return [...this.store.rooms.values()]
            .filter(room => room.buildingId === buildingId)
            .map(room => this.#withBuilding(room));
    }

    async createRoom({ buildingId, name, capacity }) {
        if ([...this.store.rooms.values()].some(room => room.buildingId === buildingId && room.name === name)) {
            throw new ConflictError("Resource already exists", "UNIQUE_VIOLATION");
        }

        const room = { id: nextId(this.store.rooms), buildingId, name, capacity, createdAt: new Date() };
        this.store.rooms.set(room.id, room);
        return this.#withBuilding(room);
    }
}

function nextId(map) {
    return Math.max(0, ...map.keys()) + 1;
}
