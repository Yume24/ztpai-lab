import { ReservationEvents } from "../modules/reservations/reservations.events.js";

export function registerAuditListeners(eventBus, { runInTransaction }) {
    const save = event => runInTransaction(({ auditLogRepository }) => auditLogRepository.addEntry({
        eventType: event.name,
        payload: event.payload,
        createdAt: event.occurredAt
    }));

    for (const eventName of Object.values(ReservationEvents)) {
        eventBus.subscribe(eventName, save);
    }
}
