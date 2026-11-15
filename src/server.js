import { config } from "./config/index.js";
import { createApp } from "./app.js";
import { db } from "./db/knex.js";
import { createKnexUnitOfWork } from "./persistence/unitOfWork.knex.js";
import { createInMemoryUnitOfWork } from "./persistence/unitOfWork.memory.js";
import { createMemorySeed } from "./persistence/memory.seed.js";
import { createEventBus } from "./events/eventBus.js";
import { registerAuditListeners } from "./events/auditListeners.js";
import { registerNotificationListeners } from "./events/notificationListeners.js";

const SHUTDOWN_TIMEOUT_MS = 8000;

const unitOfWork = config.STORAGE === "memory"
    ? createInMemoryUnitOfWork(await createMemorySeed())
    : createKnexUnitOfWork(db);

const eventBus = createEventBus();
registerAuditListeners(eventBus, unitOfWork);
registerNotificationListeners(eventBus, unitOfWork);

const app = createApp({ ...unitOfWork, eventBus, jwtSecret: config.JWT_SECRET, jwtExpiresIn: config.JWT_EXPIRES_IN });
const server = app.listen(config.PORT, () => console.log(`Server listening on port ${config.PORT} (storage: ${config.STORAGE})`));

let shuttingDown = false;

function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);

    // Gdyby jakiś request wisiał, kończymy sami, zanim Docker po 10 s wyśle SIGKILL.
    setTimeout(() => {
        console.error(`Graceful shutdown did not finish in ${SHUTDOWN_TIMEOUT_MS} ms, forcing exit`);
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();

    // close() przestaje przyjmować nowe połączenia i czeka na zakończenie trwających requestów.
    server.close(async err => {
        try {
            // Listenery mogą jeszcze zapisywać audit log - pulę zamykamy dopiero po nich.
            await eventBus.drain();
            await db.destroy();
            console.log("HTTP server closed, database connections closed");
            process.exit(err ? 1 : 0);
        } catch (destroyErr) {
            console.error("Error while closing database connections", destroyErr);
            process.exit(1);
        }
    });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
