import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import request from "supertest";
import { app, closeTestApp, db, resetDatabase } from "./testApp.js";

beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    await db.migrate.latest();
});

beforeEach(resetDatabase);

afterAll(closeTestApp);

describe("Auth API", () => {
    test("register + login + GET /api/auth/me", async () => {
        const credentials = { email: "Ewa.Nowak@Example.com", password: "bardzo-dlugie-haslo" };

        const registered = await request(app).post("/api/auth/register").send(credentials);
        expect(registered.status).toBe(201);
        expect(registered.body).toMatchObject({ email: "ewa.nowak@example.com", role: "USER" });
        expect(registered.body).not.toHaveProperty("passwordHash");

        const row = await db("users").where({ id: registered.body.id }).first();
        expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/);

        const loggedIn = await request(app).post("/api/auth/login").send(credentials);
        expect(loggedIn.status).toBe(200);
        expect(loggedIn.body).toMatchObject({ tokenType: "Bearer", expiresIn: "15m" });

        const me = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${loggedIn.body.accessToken}`);
        expect(me.status).toBe(200);
        expect(me.body).toEqual({
            id: registered.body.id,
            email: "ewa.nowak@example.com",
            role: "USER",
            createdAt: registered.body.createdAt
        });
    });

    test("401 INVALID_CREDENTIALS for wrong password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "jan@example.com", password: "wrong-password" });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });
});
