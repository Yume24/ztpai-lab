import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { Role } from "../users/users.roles.js";
import { createRoomBody, roomIdParams } from "./rooms.schemas.js";

export function createRoomsRouter(controller) {
    const router = Router();

    router.get("/", controller.list);
    router.post("/", authorize(Role.ADMIN), validate({ body: createRoomBody }), controller.create);
    router.get("/:id", validate({ params: roomIdParams }), controller.getById);

    return router;
}
