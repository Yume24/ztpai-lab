import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { listAuditLogQuery } from "./audit.schemas.js";

export function createAuditLogRouter(controller) {
    const router = Router();

    router.get("/", validate({ query: listAuditLogQuery }), controller.list);

    return router;
}
