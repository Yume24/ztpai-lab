import { InMemoryBuildingsRepository } from "../modules/buildings/buildings.repository.memory.js";
import { InMemoryRoomsRepository } from "../modules/rooms/rooms.repository.memory.js";
import { InMemoryReservationsRepository } from "../modules/reservations/reservations.repository.memory.js";
import { InMemoryUsersRepository } from "../modules/users/users.repository.memory.js";
import { InMemoryAuditLogRepository } from "../modules/audit/audit.repository.memory.js";

const toMap = items => new Map(items.map(item => [item.id, structuredClone(item)]));

export function createInMemoryUnitOfWork({ users = [], buildings = [], rooms = [], reservations = [], auditLog = [] } = {}) {
    const store = {
        users: toMap(users),
        buildings: toMap(buildings),
        rooms: toMap(rooms),
        reservations: toMap(reservations),
        auditLog: toMap(auditLog)
    };

    const repositories = {
        buildingsRepository: new InMemoryBuildingsRepository(store),
        roomsRepository: new InMemoryRoomsRepository(store),
        reservationsRepository: new InMemoryReservationsRepository(store),
        usersRepository: new InMemoryUsersRepository(store),
        auditLogRepository: new InMemoryAuditLogRepository(store)
    };

    return { runInTransaction: fn => fn(repositories) };
}
