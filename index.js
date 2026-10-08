const express = require("express");

const PORT = 8000;

const rooms = new Map([
  [1, { id: 1, name: "A101", capacity: 30 }],
  [2, { id: 2, name: "A102", capacity: 25 }],
  [3, { id: 3, name: "A103", capacity: 40 }],
  [4, { id: 4, name: "A104", capacity: 35 }],
  [5, { id: 5, name: "A105", capacity: 20 }]
]);

const app = express();

app.use(express.json());

app.get("/api/rooms", (req, res) => res.json([...rooms.values()]));

app.get("/api/rooms/:id", (req, res) => {
    const id = Number(req.params.id);
    const room = rooms.get(id);
    if (!room) return res.status(404).json({ message: `Room with id ${req.params.id} does not exist` });
    res.json(room);
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));