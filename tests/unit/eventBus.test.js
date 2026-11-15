import { describe, expect, jest, test } from "@jest/globals";
import { createEventBus } from "../../src/events/eventBus.js";

const NOW = new Date("2026-12-01T08:00:00Z");

describe("eventBus", () => {
    test("delivers name, occurredAt and payload to every subscriber", async () => {
        const bus = createEventBus({ now: () => NOW });
        const first = jest.fn();
        const second = jest.fn();
        bus.subscribe("reservation.created", first);
        bus.subscribe("reservation.created", second);

        bus.publish("reservation.created", { reservationId: 1 });
        await bus.drain();

        const event = { name: "reservation.created", occurredAt: NOW.toISOString(), payload: { reservationId: 1 } };
        expect(first).toHaveBeenCalledWith(event);
        expect(second).toHaveBeenCalledWith(event);
    });

    test("publish returns before handlers run", async () => {
        const bus = createEventBus();
        const handler = jest.fn();
        bus.subscribe("reservation.created", handler);

        bus.publish("reservation.created", {});
        expect(handler).not.toHaveBeenCalled();

        await bus.drain();
        expect(handler).toHaveBeenCalledTimes(1);
    });

    test("failing handlers do not affect the publisher or other handlers", async () => {
        const logger = { error: jest.fn() };
        const bus = createEventBus({ logger });
        const healthy = jest.fn();
        bus.subscribe("reservation.cancelled", () => { throw new Error("sync failure"); });
        bus.subscribe("reservation.cancelled", async () => { throw new Error("async failure"); });
        bus.subscribe("reservation.cancelled", healthy);

        expect(() => bus.publish("reservation.cancelled", {})).not.toThrow();
        await bus.drain();

        expect(healthy).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledTimes(2);
        expect(logger.error).toHaveBeenCalledWith(
            "[event:reservation.cancelled] handler failed",
            expect.objectContaining({ message: "sync failure" })
        );
    });

    test("ignores events without subscribers", () => {
        const bus = createEventBus();

        expect(() => bus.publish("reservation.created", {})).not.toThrow();
    });
});
