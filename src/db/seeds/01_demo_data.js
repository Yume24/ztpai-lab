import { hashPassword } from "../../modules/auth/password.js";

const USER_EMAILS = [
    "jan.kowalski@example.com",
    "anna.nowak@example.com",
    "piotr.wisniewski@example.com",
    "katarzyna.wojcik@example.com",
    "tomasz.zielinski@example.com"
];

export async function seed(knex) {
    await knex.raw("TRUNCATE reservations, rooms, buildings, users RESTART IDENTITY CASCADE");

    await knex("users").insert({
        email: "admin@example.com",
        password_hash: await hashPassword("admin-password-123"),
        role: "ADMIN",
        created_at: "2026-10-01T08:00:00Z"
    });

    for (const email of USER_EMAILS) {
        await knex("users").insert({
            email,
            password_hash: await hashPassword("user-password-123"),
            role: "USER",
            created_at: "2026-10-01T08:00:00Z"
        });
    }

    await knex("buildings").insert([
        { name: "Budynek A", address: "ul. Warszawska 24, Kraków", created_at: "2026-10-01T08:00:00Z" },
        { name: "Budynek B", address: "ul. Podchorążych 2, Kraków", created_at: "2026-10-01T08:00:00Z" },
        { name: "Budynek C", address: "al. Mickiewicza 30, Kraków", created_at: "2026-10-01T08:00:00Z" }
    ]);

    await knex("rooms").insert([
        { building_id: 1, name: "101", capacity: 30, created_at: "2026-10-02T08:00:00Z" },
        { building_id: 1, name: "102", capacity: 25, created_at: "2026-10-02T08:00:00Z" },
        { building_id: 1, name: "201", capacity: 40, created_at: "2026-10-02T08:00:00Z" },
        { building_id: 2, name: "101", capacity: 35, created_at: "2026-10-02T08:00:00Z" },
        { building_id: 2, name: "Aula", capacity: 120, created_at: "2026-10-02T08:00:00Z" }
    ]);

    await knex("reservations").insert([
        {
            room_id: 1, user_id: 2, participants: 20,
            start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T12:00:00Z",
            status: "CONFIRMED", created_at: "2026-10-27T08:00:00Z"
        },
        {
            room_id: 1, user_id: 3, participants: 15,
            start_time: "2026-11-10T12:00:00Z", end_time: "2026-11-10T13:00:00Z",
            status: "CONFIRMED", created_at: "2026-10-28T09:00:00Z"
        },
        {
            room_id: 4, user_id: 4, participants: 30,
            start_time: "2026-11-11T09:00:00Z", end_time: "2026-11-11T11:00:00Z",
            status: "CONFIRMED", created_at: "2026-10-29T10:00:00Z"
        },
        {
            room_id: 2, user_id: 5, participants: 10,
            start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T11:30:00Z",
            status: "CANCELLED", created_at: "2026-10-30T11:00:00Z", cancelled_at: "2026-10-31T11:00:00Z"
        },
        {
            room_id: 5, user_id: 6, participants: 80,
            start_time: "2026-10-31T09:00:00Z", end_time: "2026-10-31T12:00:00Z",
            status: "CONFIRMED", created_at: "2026-10-25T12:00:00Z"
        }
    ]);
}
