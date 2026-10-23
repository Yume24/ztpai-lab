import { createApp } from "./app.js";
import { InMemoryRoomsRepository } from "./modules/rooms/rooms.repository.memory.js";
import { InMemoryReservationsRepository } from "./modules/reservations/reservations.repository.memory.js";

const PORT = 8000;
const HOUR_MS = 60 * 60 * 1000;

const roomsRepository = new InMemoryRoomsRepository([
    { id: 1, name: "A101", capacity: 30 },
    { id: 2, name: "A102", capacity: 25 },
    { id: 3, name: "A103", capacity: 40 },
    { id: 4, name: "A104", capacity: 35 },
    { id: 5, name: "A105", capacity: 20 }
]);

// Seed: rezerwacja, która już trwa (startTime <= now) - do testowania RESERVATION_ALREADY_STARTED.
const nowMs = Date.now();
const reservationsRepository = new InMemoryReservationsRepository([
    {
        id: 1,
        roomId: 5,
        reservedBy: "Seed Started",
        participants: 10,
        startTime: new Date(nowMs - HOUR_MS),
        endTime: new Date(nowMs + HOUR_MS),
        status: "CONFIRMED",
        createdAt: new Date(nowMs - 24 * HOUR_MS),
        cancelledAt: null,
        internalNote: "seed: already started"
    }
]);

const app = createApp({ roomsRepository, reservationsRepository });
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
