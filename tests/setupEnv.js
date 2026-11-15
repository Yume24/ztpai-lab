// Uruchamiany przed każdym plikiem testowym, zanim jakikolwiek moduł wczyta src/config.
// process.loadEnvFile() w configu nie nadpisuje ustawionych zmiennych, więc DATABASE_URL z .env
// (baza deweloperska) nie trafi do testów.
process.env.NODE_ENV = "test";
process.env.STORAGE = "postgres";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    ?? "postgres://roombooking:change-me@localhost:5432/roombooking_test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.JWT_EXPIRES_IN = "15m";

// Testy integracyjne czyszczą tabele, więc odmawiamy pracy na bazie bez sufiksu _test.
const databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (!databaseName.endsWith("_test")) {
    throw new Error(`Tests need a separate database with a name ending in _test, got "${databaseName}"`);
}
