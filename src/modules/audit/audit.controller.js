import { toAuditEntryResponse } from "./audit.mapper.js";

export function createAuditLogController(auditLogService) {
    return {
        async list(req, res) {
            const { items, meta } = await auditLogService.listEntries(req.validated.query);
            res.json({ data: items.map(toAuditEntryResponse), meta });
        }
    };
}
