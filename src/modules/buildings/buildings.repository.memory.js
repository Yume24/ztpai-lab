import { ConflictError } from "../../errors/AppError.js";

export class InMemoryBuildingsRepository {
    constructor(store) {
        this.store = store;
    }

    #withRoomsCount(building) {
        const roomsCount = [...this.store.rooms.values()].filter(room => room.buildingId === building.id).length;
        return { ...building, roomsCount };
    }

    async getAllBuildings() {
        return [...this.store.buildings.values()].map(building => this.#withRoomsCount(building));
    }

    async getBuildingById(id) {
        const building = this.store.buildings.get(id);
        return building ? this.#withRoomsCount(building) : null;
    }

    async createBuilding({ name, address }) {
        if ([...this.store.buildings.values()].some(building => building.name === name)) {
            throw new ConflictError("Resource already exists", "UNIQUE_VIOLATION");
        }

        const building = { id: nextId(this.store.buildings), name, address, createdAt: new Date() };
        this.store.buildings.set(building.id, building);
        return this.#withRoomsCount(building);
    }
}

function nextId(map) {
    return Math.max(0, ...map.keys()) + 1;
}
