import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { buildingIdParams, createBuildingBody } from "./buildings.schemas.js";

export function createBuildingsRouter(controller) {
    const router = Router();

    router.get("/", controller.list);
    router.post("/", validate({ body: createBuildingBody }), controller.create);
    router.get("/:id", validate({ params: buildingIdParams }), controller.getById);
    router.get("/:id/rooms", validate({ params: buildingIdParams }), controller.listRooms);

    return router;
}
