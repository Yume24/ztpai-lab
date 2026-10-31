import { z } from "zod";

const email = z.email().max(254).toLowerCase();

export const registerBody = z.strictObject({
    email,
    password: z.string()
        .min(10, "Password must have at least 10 characters")
        .max(72, "Password can have at most 72 characters")
});
