import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { roomIdParams } from "./rooms.schemas.js";

export function createRoomsRouter(controller) {
    const router = Router();

    router.get("/", controller.list);
    router.get("/:id", validate({ params: roomIdParams }), controller.getById);

    return router;
}
