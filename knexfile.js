try {
    process.loadEnvFile();
} catch {
}

export default {
    client: "pg",
    connection: process.env.DATABASE_URL,
    migrations: { directory: "./src/db/migrations" },
    seeds: { directory: "./src/db/seeds" }
};
