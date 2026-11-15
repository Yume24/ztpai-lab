function toAuditEntry(row) {
    return {
        id: Number(row.id),
        eventType: row.event_type,
        payload: row.payload,
        createdAt: row.created_at
    };
}

export class KnexAuditLogRepository {
    constructor(db) {
        this.db = db;
    }

    async addEntry({ eventType, payload, createdAt }) {
        const [row] = await this.db("audit_log")
            .insert({ event_type: eventType, payload: JSON.stringify(payload), created_at: createdAt })
            .returning("*");
        return toAuditEntry(row);
    }

    async listEntries({ eventType, page, limit }) {
        const filtered = this.db("audit_log").modify(query => {
            if (eventType !== undefined) query.where("event_type", eventType);
        });

        const [rows, { count }] = await Promise.all([
            filtered.clone()
                .select("*")
                .orderBy("created_at", "desc")
                .orderBy("id", "desc")
                .limit(limit)
                .offset((page - 1) * limit),
            filtered.clone().count({ count: "*" }).first()
        ]);

        return { items: rows.map(toAuditEntry), total: Number(count) };
    }
}
