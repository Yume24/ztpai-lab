import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import request from "supertest";
import { app, closeTestApp, db, eventBus, login, resetDatabase } from "./testApp.js";

const bearer = token => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    await db.migrate.latest();
});

beforeEach(resetDatabase);

afterAll(closeTestApp);

describe("Audit log API", () => {
    test("ADMIN gets events from create -> conflict -> cancel -> cancel again, newest first", async () => {
        const janToken = await login("jan@example.com");
        const adminToken = await login("admin@example.com");
        const body = { roomId: 1, participants: 5, startTime: "2026-12-01T10:00:00Z", endTime: "2026-12-01T11:00:00Z" };

        const { body: created } = await request(app).post("/api/reservations").set(bearer(janToken)).send(body).expect(201);
        await eventBus.drain();
        await request(app).post("/api/reservations").set(bearer(adminToken)).send(body).expect(409);
        await request(app).patch(`/api/reservations/${created.id}/cancel`).set(bearer(adminToken)).expect(200);
        await request(app).patch(`/api/reservations/${created.id}/cancel`).set(bearer(adminToken)).expect(200);
        await eventBus.drain();

        const res = await request(app).get("/api/admin/audit-log").set(bearer(adminToken));

        expect(res.status).toBe(200);
        expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
        expect(res.body.data.map(entry => [entry.eventType, entry.payload])).toEqual([
            ["reservation.cancelled", { reservationId: created.id, roomId: 1, userId: 2, cancelledBy: 1 }],
            ["reservation.created", {
                reservationId: created.id, roomId: 1, userId: 2,
                startTime: "2026-12-01T10:00:00.000Z", endTime: "2026-12-01T11:00:00.000Z"
            }]
        ]);

        const filtered = await request(app)
            .get("/api/admin/audit-log?eventType=reservation.created")
            .set(bearer(adminToken));
        expect(filtered.body.meta.total).toBe(1);
        expect(filtered.body.data[0].eventType).toBe("reservation.created");
    });

    test("403 for USER", async () => {
        const token = await login("jan@example.com");

        const res = await request(app).get("/api/admin/audit-log").set(bearer(token));

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("FORBIDDEN");
    });
});
