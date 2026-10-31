import express from "express";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { BuildingsService } from "./modules/buildings/buildings.service.js";
import { createBuildingsController } from "./modules/buildings/buildings.controller.js";
import { createBuildingsRouter } from "./modules/buildings/buildings.routes.js";
import { RoomsService } from "./modules/rooms/rooms.service.js";
import { createRoomsController } from "./modules/rooms/rooms.controller.js";
import { createRoomsRouter } from "./modules/rooms/rooms.routes.js";
import { ReservationsService } from "./modules/reservations/reservations.service.js";
import { createReservationsController } from "./modules/reservations/reservations.controller.js";
import { createReservationsRouter } from "./modules/reservations/reservations.routes.js";

export function createApp({ runInTransaction, now }) {
    const app = express();

    app.use(requestLogger);
    app.use(express.json());

    const buildingsService = new BuildingsService({ runInTransaction });
    const roomsService = new RoomsService({ runInTransaction });
    const reservationsService = new ReservationsService({ runInTransaction, now });

    app.use("/api/buildings", createBuildingsRouter(createBuildingsController(buildingsService)));
    app.use("/api/rooms", createRoomsRouter(createRoomsController(roomsService)));
    app.use("/api/reservations", createReservationsRouter(createReservationsController(reservationsService)));

    app.use(notFound);
    app.use(errorHandler);

    return app;
}
