import { KnexBuildingsRepository } from "../modules/buildings/buildings.repository.knex.js";
import { KnexRoomsRepository } from "../modules/rooms/rooms.repository.knex.js";
import { KnexReservationsRepository } from "../modules/reservations/reservations.repository.knex.js";

function createKnexRepositories(db) {
    return {
        buildingsRepository: new KnexBuildingsRepository(db),
        roomsRepository: new KnexRoomsRepository(db),
        reservationsRepository: new KnexReservationsRepository(db)
    };
}

export function createKnexUnitOfWork(db) {
    return {
        runInTransaction: fn => db.transaction(trx => fn(createKnexRepositories(trx)))
    };
}
