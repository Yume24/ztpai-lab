import { describe, expect, jest, test } from "@jest/globals";
import { createEventBus } from "../../src/events/eventBus.js";
import { registerAuditListeners } from "../../src/events/auditListeners.js";
import { registerNotificationListeners } from "../../src/events/notificationListeners.js";
import { createInMemoryUnitOfWork } from "../../src/persistence/unitOfWork.memory.js";

const owner = { id: 1, email: "owner@example.com", role: "USER" };
const otherUser = { id: 2, email: "other@example.com", role: "USER" };
const admin = { id: 3, email: "admin@example.com", role: "ADMIN" };

function setup() {
    const unitOfWork = createInMemoryUnitOfWork({ users: [owner, otherUser, admin] });
    const logger = { log: jest.fn(), error: jest.fn() };
    const eventBus = createEventBus({ logger });
    registerAuditListeners(eventBus, unitOfWork);
    registerNotificationListeners(eventBus, { ...unitOfWork, logger });
    return { eventBus, logger, runInTransaction: unitOfWork.runInTransaction };
}

const cancelled = cancelledBy => ({ reservationId: 7, roomId: 1, userId: owner.id, cancelledBy });

describe("audit listener", () => {
    test("saves every reservation event to the audit log", async () => {
        const { eventBus, runInTransaction } = setup();
        const created = { reservationId: 7, roomId: 1, userId: owner.id, startTime: "2026-12-01T10:00:00.000Z", endTime: "2026-12-01T11:00:00.000Z" };

        eventBus.publish("reservation.created", created);
        eventBus.publish("reservation.cancelled", cancelled(owner.id));
        await eventBus.drain();

        const { items, total } = await runInTransaction(({ auditLogRepository }) =>
            auditLogRepository.listEntries({ page: 1, limit: 20 }));
        expect(total).toBe(2);
        expect(items.map(entry => [entry.eventType, entry.payload])).toEqual(expect.arrayContaining([
            ["reservation.created", created],
            ["reservation.cancelled", cancelled(owner.id)]
        ]));
    });
});

describe("notification listener", () => {
    test("notifies the owner when ADMIN cancels their reservation", async () => {
        const { eventBus, logger } = setup();

        eventBus.publish("reservation.cancelled", cancelled(admin.id));
        await eventBus.drain();

        expect(logger.log).toHaveBeenCalledTimes(1);
        expect(logger.log).toHaveBeenCalledWith(expect.stringMatching(/^\[notification\] to: owner@example\.com /));
    });

    test("does not notify when the owner cancels their own reservation", async () => {
        const { eventBus, logger } = setup();

        eventBus.publish("reservation.cancelled", cancelled(owner.id));
        await eventBus.drain();

        expect(logger.log).not.toHaveBeenCalled();
    });

    test("does not notify when ADMIN cancels own reservation", async () => {
        const { eventBus, logger } = setup();

        eventBus.publish("reservation.cancelled", { reservationId: 8, roomId: 1, userId: admin.id, cancelledBy: admin.id });
        await eventBus.drain();

        expect(logger.log).not.toHaveBeenCalled();
    });
});
