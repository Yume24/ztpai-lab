import { NotFoundError } from "../../errors/AppError.js";

export class RoomsService {
    constructor({ roomsRepository }) {
        this.roomsRepository = roomsRepository;
    }

    async listRooms() {
        return this.roomsRepository.getAllRooms();
    }

    async getRoom(id) {
        const room = await this.roomsRepository.getRoomById(id);
        if (!room) throw new NotFoundError("Room");
        return room;
    }
}
