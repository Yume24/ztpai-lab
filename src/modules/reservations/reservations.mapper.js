const toIso = value => (value ? new Date(value).toISOString() : null);

export function toReservationResponse(reservation) {
    const { room } = reservation;
    return {
        id: reservation.id,
        room: {
            id: room.id,
            name: room.name,
            building: { id: room.building.id, name: room.building.name }
        },
        user: { id: reservation.user.id, email: reservation.user.email },
        participants: reservation.participants,
        startTime: toIso(reservation.startTime),
        endTime: toIso(reservation.endTime),
        status: reservation.status,
        createdAt: toIso(reservation.createdAt),
        cancelledAt: toIso(reservation.cancelledAt)
    };
}
