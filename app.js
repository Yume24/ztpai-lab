import express from "express";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { RoomsService } from "./modules/rooms/rooms.service.js";
import { createRoomsController } from "./modules/rooms/rooms.controller.js";
import { createRoomsRouter } from "./modules/rooms/rooms.routes.js";
import { ReservationsService } from "./modules/reservations/reservations.service.js";
import { createReservationsController } from "./modules/reservations/reservations.controller.js";
import { createReservationsRouter } from "./modules/reservations/reservations.routes.js";

export function createApp({ roomsRepository, reservationsRepository, now }) {
    const app = express();

    app.use(requestLogger);
    app.use(express.json());

    const roomsService = new RoomsService({ roomsRepository });
    const reservationsService = new ReservationsService({ reservationsRepository, roomsRepository, now });

    app.use("/api/rooms", createRoomsRouter(createRoomsController(roomsService)));
    app.use("/api/reservations", createReservationsRouter(createReservationsController(reservationsService)));

    // TEMPORARY (zadanie 3): endpoint do pokazania obsługi błędu 500 - do usunięcia po oddaniu.
    app.get("/api/debug/crash", () => {
        throw new Error("boom");
    });

    app.use(notFound);
    app.use(errorHandler);

    return app;
}
