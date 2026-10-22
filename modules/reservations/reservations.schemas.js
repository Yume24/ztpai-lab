import { z } from "zod";

const positiveInt = z.number().int().positive();
const isoDateTime = z.iso.datetime({ offset: true });

export const reservationIdParams = z.object({
    id: z.coerce.number().int().positive()
});

export const listReservationsQuery = z.object({
    roomId: z.coerce.number().int().positive().optional()
});

export const createReservationBody = z.strictObject({
    roomId: positiveInt,
    reservedBy: z.string().trim().min(3).max(100),
    participants: positiveInt,
    startTime: isoDateTime,
    endTime: isoDateTime
});
