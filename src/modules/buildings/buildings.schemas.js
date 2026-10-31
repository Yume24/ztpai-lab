import { z } from "zod";
import { idParam } from "../common.schemas.js";

export const buildingIdParams = z.object({
    id: idParam
});

export const createBuildingBody = z.strictObject({
    name: z.string().trim().min(1).max(100),
    address: z.string().trim().min(3).max(200)
});
