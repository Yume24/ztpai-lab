import { z } from "zod";

try {
    process.loadEnvFile();
} catch (err) {
    if (err.code !== "ENOENT") throw err;
}

const envSchema = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(8000),
    STORAGE: z.enum(["postgres", "memory"]).default("postgres"),
    DATABASE_URL: z.url({
        protocol: /^postgres(ql)?$/,
        hostname: /^.+$/,
        error: "DATABASE_URL must be a valid postgres:// URL"
    }),
    JWT_SECRET: z.string({ error: "JWT_SECRET is required" })
        .min(32, "JWT_SECRET must have at least 32 characters"),
    JWT_EXPIRES_IN: z.string()
        .regex(/^[1-9]\d*[smhd]$/, "JWT_EXPIRES_IN must be a positive number with a unit s, m, h or d (e.g. 15m)")
        .default("15m")
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("Invalid environment configuration:");
    for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

export const config = Object.freeze(result.data);
