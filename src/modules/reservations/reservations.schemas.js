import { z } from "zod";
import { idParam, isoDateTime, PG_INT_MAX, positiveInt } from "../common.schemas.js";

export const SORT_OPTIONS = ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"];

export const reservationIdParams = z.object({
    id: idParam
});

export const listReservationsQuery = z.object({
    roomId: idParam.optional(),
    buildingId: idParam.optional(),
    status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
    from: isoDateTime.optional(),
    to: isoDateTime.optional(),
    page: z.coerce.number().int().min(1).max(PG_INT_MAX).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(SORT_OPTIONS).default("startTime")
}).refine(
    query => query.from === undefined || query.to === undefined || new Date(query.from) < new Date(query.to),
    { message: "from must be earlier than to", path: ["to"] }
);

export const createReservationBody = z.strictObject({
    roomId: positiveInt,
    participants: positiveInt,
    startTime: isoDateTime,
    endTime: isoDateTime
});
