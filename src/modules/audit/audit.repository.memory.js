export class InMemoryAuditLogRepository {
    constructor(store) {
        this.store = store;
    }

    async addEntry({ eventType, payload, createdAt }) {
        const entry = {
            id: Math.max(0, ...this.store.auditLog.keys()) + 1,
            eventType,
            payload: structuredClone(payload),
            createdAt: new Date(createdAt)
        };
        this.store.auditLog.set(entry.id, entry);
        return { ...entry };
    }

    async listEntries({ eventType, page, limit }) {
        const matching = [...this.store.auditLog.values()]
            .filter(entry => eventType === undefined || entry.eventType === eventType)
            .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);

        return {
            items: matching.slice((page - 1) * limit, page * limit).map(entry => ({ ...entry })),
            total: matching.length
        };
    }
}
