import { hashPassword } from "../modules/auth/password.js";

const USER_EMAILS = [
    "jan.kowalski@example.com",
    "anna.nowak@example.com",
    "piotr.wisniewski@example.com",
    "katarzyna.wojcik@example.com",
    "tomasz.zielinski@example.com"
];

export async function createMemorySeed() {
    const at = iso => new Date(iso);

    const users = [{
        id: 1, email: "admin@example.com", passwordHash: await hashPassword("admin-password-123"),
        role: "ADMIN", createdAt: at("2026-10-01T08:00:00Z")
    }];
    for (const [index, email] of USER_EMAILS.entries()) {
        users.push({
            id: index + 2, email, passwordHash: await hashPassword("user-password-123"),
            role: "USER", createdAt: at("2026-10-01T08:00:00Z")
        });
    }

    return {
        users,
        buildings: [
            { id: 1, name: "Budynek A", address: "ul. Warszawska 24, Kraków", createdAt: at("2026-10-01T08:00:00Z") },
            { id: 2, name: "Budynek B", address: "ul. Podchorążych 2, Kraków", createdAt: at("2026-10-01T08:00:00Z") },
            { id: 3, name: "Budynek C", address: "al. Mickiewicza 30, Kraków", createdAt: at("2026-10-01T08:00:00Z") }
        ],
        rooms: [
            { id: 1, buildingId: 1, name: "101", capacity: 30, createdAt: at("2026-10-02T08:00:00Z") },
            { id: 2, buildingId: 1, name: "102", capacity: 25, createdAt: at("2026-10-02T08:00:00Z") },
            { id: 3, buildingId: 1, name: "201", capacity: 40, createdAt: at("2026-10-02T08:00:00Z") },
            { id: 4, buildingId: 2, name: "101", capacity: 35, createdAt: at("2026-10-02T08:00:00Z") },
            { id: 5, buildingId: 2, name: "Aula", capacity: 120, createdAt: at("2026-10-02T08:00:00Z") }
        ],
        reservations: [
            {
                id: 1, roomId: 1, userId: 2, participants: 20,
                startTime: at("2026-11-10T10:00:00Z"), endTime: at("2026-11-10T12:00:00Z"),
                status: "CONFIRMED", createdAt: at("2026-10-27T08:00:00Z"), cancelledAt: null
            },
            {
                id: 2, roomId: 1, userId: 3, participants: 15,
                startTime: at("2026-11-10T12:00:00Z"), endTime: at("2026-11-10T13:00:00Z"),
                status: "CONFIRMED", createdAt: at("2026-10-28T09:00:00Z"), cancelledAt: null
            },
            {
                id: 3, roomId: 4, userId: 4, participants: 30,
                startTime: at("2026-11-11T09:00:00Z"), endTime: at("2026-11-11T11:00:00Z"),
                status: "CONFIRMED", createdAt: at("2026-10-29T10:00:00Z"), cancelledAt: null
            },
            {
                id: 4, roomId: 2, userId: 5, participants: 10,
                startTime: at("2026-11-10T10:00:00Z"), endTime: at("2026-11-10T11:30:00Z"),
                status: "CANCELLED", createdAt: at("2026-10-30T11:00:00Z"), cancelledAt: at("2026-10-31T11:00:00Z")
            },
            {
                id: 5, roomId: 5, userId: 6, participants: 80,
                startTime: at("2026-10-31T09:00:00Z"), endTime: at("2026-10-31T12:00:00Z"),
                status: "CONFIRMED", createdAt: at("2026-10-25T12:00:00Z"), cancelledAt: null
            }
        ]
    };
}
