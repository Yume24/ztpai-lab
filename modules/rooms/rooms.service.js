import { NotFoundError } from "../../errors/AppError.js";

export class RoomsService {
    constructor({ runInTransaction }) {
        this.runInTransaction = runInTransaction;
    }

    async listRooms() {
        return this.runInTransaction(({ roomsRepository }) => roomsRepository.getAllRooms());
    }

    async getRoom(id) {
        return this.runInTransaction(async ({ roomsRepository }) => {
            const room = await roomsRepository.getRoomById(id);
            if (!room) throw new NotFoundError("Room");
            return room;
        });
    }

    async createRoom({ buildingId, name, capacity }) {
        return this.runInTransaction(async ({ buildingsRepository, roomsRepository }) => {
            const building = await buildingsRepository.getBuildingById(buildingId);
            if (!building) throw new NotFoundError("Building");
            return roomsRepository.createRoom({ buildingId, name, capacity });
        });
    }
}
