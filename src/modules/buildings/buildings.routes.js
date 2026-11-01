import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { Role } from "../users/users.roles.js";
import { buildingIdParams, createBuildingBody } from "./buildings.schemas.js";

export function createBuildingsRouter(controller) {
    const router = Router();

    router.get("/", controller.list);
    router.post("/", authorize(Role.ADMIN), validate({ body: createBuildingBody }), controller.create);
    router.get("/:id", validate({ params: buildingIdParams }), controller.getById);
    router.get("/:id/rooms", validate({ params: buildingIdParams }), controller.listRooms);

    return router;
}
