import { toReservationResponse } from "./reservations.mapper.js";

export function createReservationsController(reservationsService) {
    return {
        async list(req, res) {
            const reservations = await reservationsService.listReservations(req.validated.query);
            res.json(reservations.map(toReservationResponse));
        },

        async create(req, res) {
            const reservation = await reservationsService.createReservation(req.validated.body);
            res.status(201)
                .location(`/api/reservations/${reservation.id}`)
                .json(toReservationResponse(reservation));
        },

        async cancel(req, res) {
            const reservation = await reservationsService.cancelReservation(req.validated.params.id);
            res.json(toReservationResponse(reservation));
        }
    };
}
