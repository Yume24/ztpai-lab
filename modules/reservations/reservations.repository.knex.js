const COLUMNS = {
    roomId: "room_id",
    reservedBy: "reserved_by",
    participants: "participants",
    startTime: "start_time",
    endTime: "end_time",
    status: "status",
    createdAt: "created_at",
    cancelledAt: "cancelled_at"
};

function toColumns(data) {
    return Object.fromEntries(
        Object.entries(data)
            .filter(([field]) => Object.hasOwn(COLUMNS, field))
            .map(([field, value]) => [COLUMNS[field], value])
    );
}

function toReservation(row) {
    if (!row) return null;
    return {
        id: row.id,
        roomId: row.room_id,
        reservedBy: row.reserved_by,
        participants: row.participants,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        createdAt: row.created_at,
        cancelledAt: row.cancelled_at,
        room: {
            id: row.room_id,
            name: row.room_name,
            building: { id: row.building_id, name: row.building_name }
        }
    };
}

function applyFilters(query, { roomId, buildingId, status, from, to }) {
    if (roomId !== undefined) query.where("res.room_id", roomId);
    if (buildingId !== undefined) query.where("r.building_id", buildingId);
    if (status !== undefined) query.where("res.status", status);
    if (to !== undefined) query.where("res.start_time", "<", to);
    if (from !== undefined) query.where("res.end_time", ">", from);
}

export class KnexReservationsRepository {
    constructor(db) {
        this.db = db;
    }

    #joined() {
        return this.db("reservations as res")
            .join("rooms as r", "r.id", "res.room_id")
            .join("buildings as b", "b.id", "r.building_id");
    }

    #selectJoined(query) {
        return query.select("res.*", "r.name as room_name", "r.building_id", "b.name as building_name");
    }

    async createReservation(data) {
        const [{ id }] = await this.db("reservations").insert(toColumns(data)).returning("id");
        return this.getReservationById(id);
    }

    async getReservationById(id) {
        return toReservation(await this.#selectJoined(this.#joined()).where("res.id", id).first());
    }

    async findReservations(filters = {}) {
        const rows = await this.#selectJoined(this.#joined())
            .modify(applyFilters, filters)
            .orderBy("res.start_time", "asc")
            .orderBy("res.id", "asc");
        return rows.map(toReservation);
    }

    async updateReservation(id, changes) {
        await this.db("reservations").where({ id }).update(toColumns(changes));
        return this.getReservationById(id);
    }
}
