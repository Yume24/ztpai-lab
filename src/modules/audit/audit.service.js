export class AuditLogService {
    constructor({ runInTransaction }) {
        this.runInTransaction = runInTransaction;
    }

    async listEntries(query) {
        return this.runInTransaction(async ({ auditLogRepository }) => {
            const { items, total } = await auditLogRepository.listEntries(query);
            return {
                items,
                meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }
            };
        });
    }
}
