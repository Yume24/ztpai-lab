const express = require("express");

const PORT = 8000;

const rooms = new Map([
  [1, { id: 1, name: "A101", capacity: 30 }],
  [2, { id: 2, name: "A102", capacity: 25 }],
  [3, { id: 3, name: "A103", capacity: 40 }],
  [4, { id: 4, name: "A104", capacity: 35 }],
  [5, { id: 5, name: "A105", capacity: 20 }]
]);

const reservations = new Map();
let reservationNextFreeId = 1;

const reservationStatuses = Object.freeze({ CONFIRMED: "CONFIRMED", CANCELLED: "CANCELLED" });
const roomErrors = Object.freeze({
    DOES_NOT_EXIST: "DOES_NOT_EXIST",
    INSUFFICIENT_CAPACITY: "INSUFFICIENT_CAPACITY"
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const app = express();

app.use(express.json());

app.get("/api/rooms", (req, res) => res.json([...rooms.values()]));

app.get("/api/rooms/:id", (req, res) => {
    const id = Number(req.params.id);
    const room = rooms.get(id);
    if (!room) return res.status(404).json({ message: `Room with id ${req.params.id} does not exist` });
    res.json(room);
});

function validateRoomParticipants(roomId, participants) {
    const room = rooms.get(roomId);
    if (!room) return roomErrors.DOES_NOT_EXIST;
    if (participants > room.capacity) return roomErrors.INSUFFICIENT_CAPACITY;

    return null;
}

function validateReservation({ reservedBy, participants, date, roomId } = {}) {
    const errors = [];

    if (!(Number.isInteger(roomId) && roomId > 0)) errors.push("Invalid roomId");
    if (typeof reservedBy !== "string" || !reservedBy.trim()) errors.push("Invalid reservedBy");
    if (!(Number.isInteger(participants) && participants > 0)) errors.push("Invalid participant number");
    if (typeof date !== "string" || !DATE_RE.test(date) || Number.isNaN(Date.parse(date)))
        errors.push("Invalid date, expected YYYY-MM-DD");

    return errors;
}

function saveReservation({ roomId, reservedBy, participants, date }) {
    const reservation = {
        id: reservationNextFreeId++,
        roomId,
        reservedBy: reservedBy.trim(),
        participants,
        date,
        status: reservationStatuses.CONFIRMED
    };
    reservations.set(reservation.id, reservation);

    return reservation;
}

app.post("/api/reservations", (req, res) => {
    const reservation = req.body;

    const validationErrors = validateReservation(reservation);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }

    switch (validateRoomParticipants(reservation.roomId, reservation.participants)) {
        case roomErrors.DOES_NOT_EXIST:
            return res.status(404).json({ message: `Room with id ${reservation.roomId} does not exist` });
        case roomErrors.INSUFFICIENT_CAPACITY:
            return res.status(409).json({ message: "Room capacity exceeded" });
    }

    res.status(201).json(saveReservation(reservation));
});

app.get("/api/reservations", (req, res) => {
    const all = [...reservations.values()];
    if (req.query.roomId === undefined) return res.json(all);

    const roomId = Number(req.query.roomId);
    res.json(all.filter(reservation => reservation.roomId === roomId));
});

app.patch("/api/reservations/:id/cancel", (req, res) => {
    const reservation = reservations.get(Number(req.params.id));
    if (!reservation) return res.status(404).json({ message: "Reservation does not exist" });

    reservation.status = reservationStatuses.CANCELLED;
    res.json(reservation);
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));