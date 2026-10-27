function toRoom(row) {
    if (!row) return null;
    return {
        id: row.id,
        buildingId: row.building_id,
        name: row.name,
        capacity: row.capacity,
        createdAt: row.created_at,
        building: { id: row.building_id, name: row.building_name }
    };
}

export class KnexRoomsRepository {
    constructor(db) {
        this.db = db;
    }

    #withBuilding() {
        return this.db("rooms as r")
            .join("buildings as b", "b.id", "r.building_id")
            .select("r.id", "r.building_id", "r.name", "r.capacity", "r.created_at", "b.name as building_name");
    }

    async getAllRooms() {
        const rows = await this.#withBuilding().orderBy("r.id");
        return rows.map(toRoom);
    }

    async getRoomById(id) {
        return toRoom(await this.#withBuilding().where("r.id", id).first());
    }

    async getRoomsByBuildingId(buildingId) {
        const rows = await this.#withBuilding().where("r.building_id", buildingId).orderBy("r.id");
        return rows.map(toRoom);
    }

    async createRoom({ buildingId, name, capacity }) {
        const [{ id }] = await this.db("rooms")
            .insert({ building_id: buildingId, name, capacity })
            .returning("id");
        return this.getRoomById(id);
    }
}
