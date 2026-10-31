import { createApp } from "./app.js";
import { db } from "./db/knex.js";
import { createKnexUnitOfWork } from "./persistence/unitOfWork.knex.js";
import { createInMemoryUnitOfWork } from "./persistence/unitOfWork.memory.js";
import { createMemorySeed } from "./persistence/memory.seed.js";

const PORT = 8000;
const STORAGE = process.env.STORAGE === "memory" ? "memory" : "postgres";

const unitOfWork = STORAGE === "memory"
    ? createInMemoryUnitOfWork(await createMemorySeed())
    : createKnexUnitOfWork(db);

const app = createApp(unitOfWork);
app.listen(PORT, () => console.log(`Server listening on port ${PORT} (storage: ${STORAGE})`));
