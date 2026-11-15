import { z } from "zod";
import { PG_INT_MAX } from "../common.schemas.js";

export const listAuditLogQuery = z.object({
    eventType: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(PG_INT_MAX).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});
