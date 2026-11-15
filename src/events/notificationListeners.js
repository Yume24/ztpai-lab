import { ReservationEvents } from "../modules/reservations/reservations.events.js";
import { Role } from "../modules/users/users.roles.js";

// Symulacja powiadomienia: zamiast maila wpis w konsoli, gdy ADMIN anulował cudzą rezerwację.
export function registerNotificationListeners(eventBus, { runInTransaction, logger = console }) {
    eventBus.subscribe(ReservationEvents.CANCELLED, async ({ payload }) => {
        const { reservationId, roomId, userId, cancelledBy } = payload;
        if (cancelledBy === userId) return;

        const [canceller, owner] = await runInTransaction(({ usersRepository }) => Promise.all([
            usersRepository.getUserById(cancelledBy),
            usersRepository.getUserById(userId)
        ]));
        if (canceller?.role !== Role.ADMIN || !owner) return;

        logger.log(`[notification] to: ${owner.email} - reservation #${reservationId} in room ${roomId} was cancelled by an administrator (${canceller.email})`);
    });
}
