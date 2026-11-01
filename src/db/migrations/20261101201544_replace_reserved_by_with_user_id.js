import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

function toEmail(name) {
    const trimmed = name.trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return trimmed;

    const local = name
        .replace(/ł/g, "l")
        .replace(/Ł/g, "L")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "");
    return `${local || "user"}@example.com`;
}

async function findOrCreateUser(knex, email) {
    const existing = await knex("users").where({ email }).first("id");
    if (existing) return existing.id;

    const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 12);
    const [{ id }] = await knex("users")
        .insert({ email, password_hash: passwordHash, role: "USER" })
        .returning("id");
    return id;
}

export async function up(knex) {
    await knex.schema.alterTable("reservations", table => {
        table.integer("user_id").references("id").inTable("users").onDelete("RESTRICT");
        table.index("user_id");
    });

    const owners = await knex("reservations")
        .select("reserved_by")
        .min({ first_id: "id" })
        .groupBy("reserved_by")
        .orderBy("first_id");

    for (const { reserved_by: name } of owners) {
        const userId = await findOrCreateUser(knex, toEmail(name));
        await knex("reservations").where({ reserved_by: name }).update({ user_id: userId });
    }

    await knex.schema.alterTable("reservations", table => {
        table.dropNullable("user_id");
        table.dropColumn("reserved_by");
    });
}

export async function down(knex) {
    await knex.schema.alterTable("reservations", table => {
        table.string("reserved_by", 254);
    });

    await knex.raw("UPDATE reservations SET reserved_by = users.email FROM users WHERE users.id = reservations.user_id");

    await knex.schema.alterTable("reservations", table => {
        table.dropNullable("reserved_by");
        table.dropColumn("user_id");
    });
}
