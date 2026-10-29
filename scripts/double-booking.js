import { db } from "../db/knex.js";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const ROOM_ID = Number(process.env.ROOM_ID ?? 1);
const REQUESTS = 10;

const start = new Date();
start.setUTCDate(start.getUTCDate() + 30);
start.setUTCHours(10, 0, 0, 0);
const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

const body = {
    roomId: ROOM_ID,
    reservedBy: "Double Booking Script",
    participants: 5,
    startTime: start.toISOString(),
    endTime: end.toISOString()
};

const overlapping = () => db("reservations")
    .where("room_id", ROOM_ID)
    .where("start_time", "<", body.endTime)
    .where("end_time", ">", body.startTime);

async function sendRequest(n) {
    const res = await fetch(`${API_URL}/api/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => null);
    return { n, status: res.status, code: json?.error?.code ?? null, id: json?.id ?? null };
}

try {
    const removed = await overlapping().del();
    console.log(`Sala ${ROOM_ID}, przedział ${body.startTime} - ${body.endTime}`);
    console.log(`(usunięto ${removed} rezerwacji z poprzednich uruchomień)\n`);

    const results = await Promise.all(Array.from({ length: REQUESTS }, (_, i) => sendRequest(i + 1)));

    for (const { n, status, code, id } of results) {
        const extra = id !== null ? `id=${id}` : code ?? "";
        console.log(`request #${String(n).padStart(2)}: ${status} ${extra}`);
    }

    const byStatus = Object.groupBy(results, r => r.status);
    const summary = Object.entries(byStatus).map(([status, list]) => `${list.length} x ${status}`).join(", ");
    console.log(`\nPodsumowanie: ${summary}`);

    const countQuery = overlapping().where("status", "CONFIRMED").count({ count: "*" }).first();
    console.log(`\nSQL: ${countQuery.toString()}`);
    const { count } = await countQuery;
    console.log(`Rezerwacje CONFIRMED w bazie dla tej sali i przedziału: ${count}`);
} finally {
    await db.destroy();
}
