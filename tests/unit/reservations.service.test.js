import { describe, expect, test } from "@jest/globals";
import { ReservationsService } from "../../src/modules/reservations/reservations.service.js";
import { createInMemoryUnitOfWork } from "../../src/persistence/unitOfWork.memory.js";

const NOW = new Date("2026-12-01T08:00:00Z");
const MINUTE = 60 * 1000;

const owner = { id: 1, role: "USER" };
const otherUser = { id: 2, role: "USER" };
const admin = { id: 3, role: "ADMIN" };

const at = time => new Date(`2026-12-01T${time}:00Z`);

function reservation(id, { roomId = 1, userId = owner.id, start, end, status = "CONFIRMED" }) {
    return {
        id, roomId, userId, participants: 5,
        startTime: at(start), endTime: at(end), status,
        createdAt: new Date("2026-11-20T10:00:00Z"),
        cancelledAt: status === "CANCELLED" ? new Date("2026-11-21T10:00:00Z") : null
    };
}

function booking(startTime, endTime, { roomId = 1, participants = 5 } = {}) {
    return { roomId, participants, startTime: startTime.toISOString(), endTime: endTime.toISOString() };
}

// Każdy test buduje własne repositories in-memory, więc kolejność testów nie ma znaczenia.
function setup({ reservations = [], now = () => NOW } = {}) {
    const { runInTransaction } = createInMemoryUnitOfWork({
        users: [
            { id: 1, email: "owner@example.com", role: "USER" },
            { id: 2, email: "other@example.com", role: "USER" },
            { id: 3, email: "admin@example.com", role: "ADMIN" }
        ],
        buildings: [{ id: 1, name: "Budynek A", address: "ul. Testowa 1" }],
        rooms: [
            { id: 1, buildingId: 1, name: "101", capacity: 10 },
            { id: 2, buildingId: 1, name: "102", capacity: 20 }
        ],
        reservations
    });
    const service = new ReservationsService({ runInTransaction, now });
    return { service };
}

// Istniejąca rezerwacja sali 1: 10:00-12:00
const existing = () => reservation(1, { start: "10:00", end: "12:00" });

describe("ReservationsService.createReservation - overlapping", () => {
    test.each([
        ["partial overlap at the start", "09:00", "10:30"],
        ["partial overlap at the end", "11:30", "13:00"],
        ["new range inside the existing one", "10:30", "11:30"],
        ["new range containing the existing one", "09:00", "13:00"],
        ["identical range", "10:00", "12:00"]
    ])("rejects %s (%s-%s)", async (_, start, end) => {
        const { service } = setup({ reservations: [existing()] });

        await expect(service.createReservation(booking(at(start), at(end)), owner))
            .rejects.toMatchObject({ statusCode: 409, code: "ROOM_ALREADY_BOOKED" });
    });

    test.each([
        ["ending when the existing one starts", "09:00", "10:00"],
        ["starting when the existing one ends", "12:00", "13:00"]
    ])("allows touching range %s (%s-%s)", async (_, start, end) => {
        const { service } = setup({ reservations: [existing()] });

        await expect(service.createReservation(booking(at(start), at(end)), owner))
            .resolves.toMatchObject({ status: "CONFIRMED" });
    });

    test("allows the same time range in another room", async () => {
        const { service } = setup({ reservations: [existing()] });

        await expect(service.createReservation(booking(at("10:00"), at("12:00"), { roomId: 2 }), owner))
            .resolves.toMatchObject({ roomId: 2, status: "CONFIRMED" });
    });

    test("CANCELLED reservation does not block the time range", async () => {
        const { service } = setup({
            reservations: [reservation(1, { start: "10:00", end: "12:00", status: "CANCELLED" })]
        });

        await expect(service.createReservation(booking(at("10:00"), at("12:00")), owner))
            .resolves.toMatchObject({ status: "CONFIRMED" });
    });

    test("creates CONFIRMED reservation owned by the current user", async () => {
        const { service } = setup();

        const created = await service.createReservation(booking(at("10:00"), at("11:00")), otherUser);

        expect(created).toMatchObject({ userId: otherUser.id, status: "CONFIRMED", cancelledAt: null });
        expect(created.createdAt).toEqual(NOW);
    });
});

describe("ReservationsService.createReservation - capacity", () => {
    test("allows participants equal to room capacity", async () => {
        const { service } = setup();

        await expect(service.createReservation(booking(at("10:00"), at("11:00"), { participants: 10 }), owner))
            .resolves.toMatchObject({ participants: 10 });
    });

    test("rejects capacity + 1 participants", async () => {
        const { service } = setup();

        await expect(service.createReservation(booking(at("10:00"), at("11:00"), { participants: 11 }), owner))
            .rejects.toMatchObject({ statusCode: 409, code: "CAPACITY_EXCEEDED" });
    });
});

describe("ReservationsService.createReservation - duration", () => {
    const from = at("09:00");
    const after = minutes => new Date(from.getTime() + minutes * MINUTE);

    test.each([
        ["exactly 15 min", 15],
        ["exactly 8 h", 8 * 60]
    ])("allows %s", async (_, minutes) => {
        const { service } = setup();

        await expect(service.createReservation(booking(from, after(minutes)), owner))
            .resolves.toMatchObject({ status: "CONFIRMED" });
    });

    test.each([
        ["14 min", 14],
        ["8 h 1 min", 8 * 60 + 1]
    ])("rejects %s", async (_, minutes) => {
        const { service } = setup();

        await expect(service.createReservation(booking(from, after(minutes)), owner))
            .rejects.toMatchObject({
                statusCode: 400,
                code: "VALIDATION_ERROR",
                details: [expect.objectContaining({ location: "body", field: "endTime" })]
            });
    });

    test("allows start exactly now", async () => {
        const { service } = setup();

        await expect(service.createReservation(booking(NOW, at("09:00")), owner))
            .resolves.toMatchObject({ status: "CONFIRMED" });
    });

    test("rejects start in the past", async () => {
        const { service } = setup();

        await expect(service.createReservation(booking(at("07:00"), at("09:00")), owner))
            .rejects.toMatchObject({
                code: "VALIDATION_ERROR",
                details: [expect.objectContaining({ field: "startTime" })]
            });
    });
});

describe("ReservationsService.cancelReservation", () => {
    test("cancels a future reservation and sets cancelledAt to now", async () => {
        const { service } = setup({ reservations: [existing()] });

        const cancelled = await service.cancelReservation(1, owner);

        expect(cancelled.status).toBe("CANCELLED");
        expect(cancelled.cancelledAt).toEqual(NOW);
    });

    test.each([
        ["in progress", "07:00", "09:00"],
        ["starting exactly now", "08:00", "09:00"]
    ])("rejects cancelling a reservation that has already started (%s)", async (_, start, end) => {
        const { service } = setup({ reservations: [reservation(1, { start, end })] });

        await expect(service.cancelReservation(1, owner))
            .rejects.toMatchObject({ statusCode: 409, code: "RESERVATION_ALREADY_STARTED" });
    });

    test("second cancel is idempotent and keeps the original cancelledAt", async () => {
        let now = NOW;
        const { service } = setup({ reservations: [existing()], now: () => now });

        const first = await service.cancelReservation(1, owner);
        now = new Date(NOW.getTime() + 60 * MINUTE);
        const second = await service.cancelReservation(1, owner);

        expect(second.status).toBe("CANCELLED");
        expect(second.cancelledAt).toEqual(first.cancelledAt);
        expect(second.cancelledAt).toEqual(NOW);
    });
});

describe("ReservationsService - ownership", () => {
    test("another USER cannot cancel someone else's reservation", async () => {
        const { service } = setup({ reservations: [existing()] });

        await expect(service.cancelReservation(1, otherUser))
            .rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
        await expect(service.getReservation(1, owner)).resolves.toMatchObject({ status: "CONFIRMED" });
    });

    test("ADMIN can cancel someone else's reservation", async () => {
        const { service } = setup({ reservations: [existing()] });

        await expect(service.cancelReservation(1, admin))
            .resolves.toMatchObject({ userId: owner.id, status: "CANCELLED" });
    });

    test("another USER cannot read someone else's reservation, ADMIN can", async () => {
        const { service } = setup({ reservations: [existing()] });

        await expect(service.getReservation(1, otherUser)).rejects.toMatchObject({ code: "NOT_FOUND" });
        await expect(service.getReservation(1, admin)).resolves.toMatchObject({ id: 1, userId: owner.id });
    });

    test("USER lists only own reservations and cannot filter by userId", async () => {
        const { service } = setup({
            reservations: [existing(), reservation(2, { userId: otherUser.id, start: "13:00", end: "14:00" })]
        });
        const query = { page: 1, limit: 20, sort: "startTime" };

        const { items, meta } = await service.listReservations(query, otherUser);
        expect(items.map(r => r.id)).toEqual([2]);
        expect(meta.total).toBe(1);

        await expect(service.listReservations({ ...query, userId: owner.id }, otherUser))
            .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    });
});
