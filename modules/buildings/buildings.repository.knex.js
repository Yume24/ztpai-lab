function toBuilding(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        address: row.address,
        createdAt: row.created_at,
        roomsCount: Number(row.rooms_count)
    };
}

export class KnexBuildingsRepository {
    constructor(db) {
        this.db = db;
    }

    #withRoomsCount() {
        return this.db("buildings as b")
            .leftJoin("rooms as r", "r.building_id", "b.id")
            .select("b.id", "b.name", "b.address", "b.created_at")
            .count({ rooms_count: "r.id" })
            .groupBy("b.id");
    }

    async getAllBuildings() {
        const rows = await this.#withRoomsCount().orderBy("b.id");
        return rows.map(toBuilding);
    }

    async getBuildingById(id) {
        return toBuilding(await this.#withRoomsCount().where("b.id", id).first());
    }

    async createBuilding({ name, address }) {
        const [row] = await this.db("buildings").insert({ name, address }).returning("*");
        return toBuilding({ ...row, rooms_count: 0 });
    }
}
