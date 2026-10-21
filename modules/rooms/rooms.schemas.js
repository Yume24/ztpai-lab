import { z } from "zod";

export const roomIdParams = z.object({
    id: z.coerce.number().int().positive()
});
