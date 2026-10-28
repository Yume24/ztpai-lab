import { InMemoryBuildingsRepository } from "../modules/buildings/buildings.repository.memory.js";
import { InMemoryRoomsRepository } from "../modules/rooms/rooms.repository.memory.js";
import { InMemoryReservationsRepository } from "../modules/reservations/reservations.repository.memory.js";

const toMap = items => new Map(items.map(item => [item.id, structuredClone(item)]));

export function createInMemoryUnitOfWork({ buildings = [], rooms = [], reservations = [] } = {}) {
    const store = { buildings: toMap(buildings), rooms: toMap(rooms), reservations: toMap(reservations) };

    const repositories = {
        buildingsRepository: new InMemoryBuildingsRepository(store),
        roomsRepository: new InMemoryRoomsRepository(store),
        reservationsRepository: new InMemoryReservationsRepository(store)
    };

    return { runInTransaction: fn => fn(repositories) };
}
