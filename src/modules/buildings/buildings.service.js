import { NotFoundError } from "../../errors/AppError.js";

export class BuildingsService {
    constructor({ runInTransaction }) {
        this.runInTransaction = runInTransaction;
    }

    async listBuildings() {
        return this.runInTransaction(({ buildingsRepository }) => buildingsRepository.getAllBuildings());
    }

    async getBuilding(id) {
        return this.runInTransaction(async ({ buildingsRepository }) => {
            const building = await buildingsRepository.getBuildingById(id);
            if (!building) throw new NotFoundError("Building");
            return building;
        });
    }

    async createBuilding({ name, address }) {
        return this.runInTransaction(({ buildingsRepository }) => buildingsRepository.createBuilding({ name, address }));
    }

    async listBuildingRooms(id) {
        return this.runInTransaction(async ({ buildingsRepository, roomsRepository }) => {
            const building = await buildingsRepository.getBuildingById(id);
            if (!building) throw new NotFoundError("Building");
            return roomsRepository.getRoomsByBuildingId(id);
        });
    }
}
