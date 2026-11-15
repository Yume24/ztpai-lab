import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import request from "supertest";
import { app, closeTestApp, db, login, resetDatabase } from "./testApp.js";

const JAN_ID = 2;
const ANNA_ID = 3;

const bearer = token => ({ Authorization: `Bearer ${token}` });

function insertReservation({ userId, roomId = 1, start, end }) {
    return db("reservations").insert({
        room_id: roomId, user_id: userId, participants: 5, start_time: start, end_time: end, status: "CONFIRMED"
    });
}

beforeAll(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    await db.migrate.latest();
});

beforeEach(resetDatabase);

afterAll(closeTestApp);

describe("Reservations API", () => {
    test("401 without token", async () => {
        const res = await request(app).get("/api/reservations");

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    test("POST /api/reservations returns 201 with Location and saves the row", async () => {
        const token = await login("jan@example.com");

        const res = await request(app)
            .post("/api/reservations")
            .set(bearer(token))
            .send({ roomId: 1, participants: 5, startTime: "2026-12-01T10:00:00Z", endTime: "2026-12-01T11:00:00Z" });

        expect(res.status).toBe(201);
        expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);
        expect(res.body).toMatchObject({ room: { id: 1 }, user: { id: JAN_ID }, status: "CONFIRMED" });

        const row = await db("reservations").where({ id: res.body.id }).first();
        expect(row).toMatchObject({ room_id: 1, user_id: JAN_ID, participants: 5, status: "CONFIRMED" });
        expect(row.start_time.toISOString()).toBe("2026-12-01T10:00:00.000Z");
    });

    test("400 with details for invalid body", async () => {
        const token = await login("jan@example.com");

        const res = await request(app)
            .post("/api/reservations")
            .set(bearer(token))
            .send({ roomId: 1, participants: 0, startTime: "jutro" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(res.body.error.details).toEqual(expect.arrayContaining([
            expect.objectContaining({ location: "body", field: "participants" }),
            expect.objectContaining({ location: "body", field: "startTime" }),
            expect.objectContaining({ location: "body", field: "endTime" })
        ]));
        expect(await db("reservations").count({ count: "*" }).first()).toEqual({ count: "0" });
    });

    test("403 when USER tries to create a room, 201 for ADMIN", async () => {
        const userToken = await login("jan@example.com");
        const adminToken = await login("admin@example.com");
        const room = { buildingId: 1, name: "301", capacity: 15 };

        const forbidden = await request(app).post("/api/rooms").set(bearer(userToken)).send(room);
        expect(forbidden.status).toBe(403);
        expect(forbidden.body.error.code).toBe("FORBIDDEN");
        expect(await db("rooms").where({ name: "301" }).first()).toBeUndefined();

        await request(app).post("/api/rooms").set(bearer(adminToken)).send(room).expect(201);
    });

    test("404 when USER gets someone else's reservation", async () => {
        await insertReservation({ userId: ANNA_ID, start: "2026-12-01T10:00:00Z", end: "2026-12-01T11:00:00Z" });
        const janToken = await login("jan@example.com");
        const annaToken = await login("anna@example.com");

        const res = await request(app).get("/api/reservations/1").set(bearer(janToken));
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("NOT_FOUND");

        await request(app).get("/api/reservations/1").set(bearer(annaToken)).expect(200);
    });

    test("409 ROOM_ALREADY_BOOKED for overlapping reservation", async () => {
        const janToken = await login("jan@example.com");
        const annaToken = await login("anna@example.com");

        await request(app)
            .post("/api/reservations")
            .set(bearer(janToken))
            .send({ roomId: 1, participants: 5, startTime: "2026-12-01T10:00:00Z", endTime: "2026-12-01T12:00:00Z" })
            .expect(201);

        const res = await request(app)
            .post("/api/reservations")
            .set(bearer(annaToken))
            .send({ roomId: 1, participants: 5, startTime: "2026-12-01T11:00:00Z", endTime: "2026-12-01T13:00:00Z" });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
        expect(await db("reservations").count({ count: "*" }).first()).toEqual({ count: "1" });
    });

    test("pagination returns meta.total and limit items", async () => {
        for (let day = 2; day <= 6; day++) {
            await insertReservation({ userId: JAN_ID, start: `2026-12-0${day}T10:00:00Z`, end: `2026-12-0${day}T11:00:00Z` });
        }
        await insertReservation({ userId: ANNA_ID, start: "2026-12-07T10:00:00Z", end: "2026-12-07T11:00:00Z" });
        const token = await login("jan@example.com");

        const res = await request(app).get("/api/reservations?limit=2&page=2").set(bearer(token));

        expect(res.status).toBe(200);
        expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
        expect(res.body.data).toHaveLength(2);
        expect(res.body.data.map(r => r.startTime)).toEqual(["2026-12-04T10:00:00.000Z", "2026-12-05T10:00:00.000Z"]);
    });
});
