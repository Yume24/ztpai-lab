import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { createRoomBody, roomIdParams } from "./rooms.schemas.js";

export function createRoomsRouter(controller) {
    const router = Router();

    router.get("/", controller.list);
    router.post("/", validate({ body: createRoomBody }), controller.create);
    router.get("/:id", validate({ params: roomIdParams }), controller.getById);

    return router;
}
