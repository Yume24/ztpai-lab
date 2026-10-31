import { z } from "zod";
import { idParam, positiveInt } from "../common.schemas.js";

export const roomIdParams = z.object({
    id: idParam
});

export const createRoomBody = z.strictObject({
    buildingId: positiveInt,
    name: z.string().trim().min(1).max(50),
    capacity: positiveInt
});
