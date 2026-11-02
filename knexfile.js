import { config } from "./src/config/index.js";

export default {
    client: "pg",
    connection: config.DATABASE_URL,
    migrations: { directory: "./src/db/migrations" },
    seeds: { directory: "./src/db/seeds" }
};
