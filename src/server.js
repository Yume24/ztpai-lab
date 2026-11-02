import { config } from "./config/index.js";
import { createApp } from "./app.js";
import { db } from "./db/knex.js";
import { createKnexUnitOfWork } from "./persistence/unitOfWork.knex.js";
import { createInMemoryUnitOfWork } from "./persistence/unitOfWork.memory.js";
import { createMemorySeed } from "./persistence/memory.seed.js";

const unitOfWork = config.STORAGE === "memory"
    ? createInMemoryUnitOfWork(await createMemorySeed())
    : createKnexUnitOfWork(db);

const app = createApp({ ...unitOfWork, jwtSecret: config.JWT_SECRET, jwtExpiresIn: config.JWT_EXPIRES_IN });
app.listen(config.PORT, () => console.log(`Server listening on port ${config.PORT} (storage: ${config.STORAGE})`));
