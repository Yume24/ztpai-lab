import { z } from "zod";

export const PG_INT_MAX = 2_147_483_647;

export const idParam = z.coerce.number().int().positive().max(PG_INT_MAX);

export const positiveInt = z.number().int().positive().max(PG_INT_MAX);

export const isoDateTime = z.iso.datetime({ offset: true });
