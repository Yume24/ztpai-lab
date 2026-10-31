import { AppError } from "../errors/AppError.js";

const PG_ERRORS = {
    "23505": { status: 409, code: "UNIQUE_VIOLATION", message: "Resource already exists" },
    "23503": { status: 409, code: "FOREIGN_KEY_VIOLATION", message: "Related resource does not exist or is still in use" },
    "23514": { status: 400, code: "CHECK_VIOLATION", message: "Data violates a database rule" },
    "23P01": { status: 409, code: "ROOM_ALREADY_BOOKED", message: "Room is already booked in the requested time range" },
    "40P01": { status: 409, code: "CONCURRENT_CONFLICT", message: "Request conflicted with a concurrent operation" }
};

export function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
                requestId: req.id
            }
        });
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({
            error: { code: "INVALID_JSON", message: "Request body is not valid JSON", requestId: req.id }
        });
    }

    const pgError = Object.hasOwn(PG_ERRORS, err.code) ? PG_ERRORS[err.code] : null;
    if (pgError) {
        console.warn(`[${req.id}] PostgreSQL ${err.code} (${err.constraint ?? "-"})`);
        return res.status(pgError.status).json({
            error: { code: pgError.code, message: pgError.message, requestId: req.id }
        });
    }

    console.error(`[${req.id}]`, err);
    res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unexpected error", requestId: req.id }
    });
}
