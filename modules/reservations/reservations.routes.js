import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { createReservationBody, listReservationsQuery, reservationIdParams } from "./reservations.schemas.js";

export function createReservationsRouter(controller) {
    const router = Router();

    router.get("/", validate({ query: listReservationsQuery }), controller.list);
    router.post("/", validate({ body: createReservationBody }), controller.create);
    router.patch("/:id/cancel", validate({ params: reservationIdParams }), controller.cancel);

    return router;
}
