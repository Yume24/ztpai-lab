import express from "express";
import swaggerUi from "swagger-ui-express";
import { openapiDocument } from "./docs/openapi.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/authenticate.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { createAuthController } from "./modules/auth/auth.controller.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { BuildingsService } from "./modules/buildings/buildings.service.js";
import { createBuildingsController } from "./modules/buildings/buildings.controller.js";
import { createBuildingsRouter } from "./modules/buildings/buildings.routes.js";
import { RoomsService } from "./modules/rooms/rooms.service.js";
import { createRoomsController } from "./modules/rooms/rooms.controller.js";
import { createRoomsRouter } from "./modules/rooms/rooms.routes.js";
import { ReservationsService } from "./modules/reservations/reservations.service.js";
import { createReservationsController } from "./modules/reservations/reservations.controller.js";
import { createReservationsRouter } from "./modules/reservations/reservations.routes.js";

export function createApp({ runInTransaction, now, jwtSecret, jwtExpiresIn }) {
    const app = express();

    app.use(requestLogger);
    app.use(express.json());

    const requireAuth = authenticate(jwtSecret);

    const authService = new AuthService({ runInTransaction, jwtSecret, jwtExpiresIn });
    const buildingsService = new BuildingsService({ runInTransaction });
    const roomsService = new RoomsService({ runInTransaction });
    const reservationsService = new ReservationsService({ runInTransaction, now });

    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument, {
        swaggerOptions: { persistAuthorization: true }
    }));
    app.use("/api/auth", createAuthRouter(createAuthController(authService), requireAuth));
    app.use("/api/buildings", requireAuth, createBuildingsRouter(createBuildingsController(buildingsService)));
    app.use("/api/rooms", requireAuth, createRoomsRouter(createRoomsController(roomsService)));
    app.use("/api/reservations", requireAuth, createReservationsRouter(createReservationsController(reservationsService)));

    app.use(notFound);
    app.use(errorHandler);

    return app;
}
