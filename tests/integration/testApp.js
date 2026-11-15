import request from "supertest";
import { config } from "../../src/config/index.js";
import { db } from "../../src/db/knex.js";
import { createApp } from "../../src/app.js";
import { createKnexUnitOfWork } from "../../src/persistence/unitOfWork.knex.js";
import { hashPassword } from "../../src/modules/auth/password.js";

export { db };

export const NOW = new Date("2026-12-01T08:00:00Z");
export const PASSWORD = "password-123";

// Aplikacja bez app.listen() - Supertest wysyła requesty bezpośrednio do Expressa.
export const app = createApp({
    ...createKnexUnitOfWork(db),
    now: () => NOW,
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN
});

let passwordHash;

// Każdy test zaczyna od tego samego stanu: ADMIN (id 1), jan (id 2), anna (id 3), sale 1 i 2.
export async function resetDatabase() {
    await db.raw("TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE");

    passwordHash ??= await hashPassword(PASSWORD);
    await db("users").insert([
        { email: "admin@example.com", password_hash: passwordHash, role: "ADMIN" },
        { email: "jan@example.com", password_hash: passwordHash, role: "USER" },
        { email: "anna@example.com", password_hash: passwordHash, role: "USER" }
    ]);
    await db("buildings").insert({ name: "Budynek A", address: "ul. Testowa 1, Kraków" });
    await db("rooms").insert([
        { building_id: 1, name: "101", capacity: 10 },
        { building_id: 1, name: "102", capacity: 20 }
    ]);
}

export async function login(email) {
    const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
    return res.body.accessToken;
}
