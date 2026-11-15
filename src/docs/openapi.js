const INT_MAX = 2147483647;

const schema = name => ({ $ref: `#/components/schemas/${name}` });
const json = body => ({ "application/json": { schema: body } });

const success = (description, body) => ({ description, content: json(body) });
const error = description => ({ description, content: json(schema("Error")) });
const body = name => ({ required: true, content: json(schema(name)) });

const idParam = description => ({
    name: "id", in: "path", required: true, description,
    schema: { type: "integer", minimum: 1, maximum: INT_MAX }
});
const queryParam = (name, description, paramSchema) => ({ name, in: "query", required: false, description, schema: paramSchema });

const invalidInput = error("Validation error: invalid body, path or query parameters, unknown fields or malformed JSON");
const unauthorized = error("Missing or malformed Authorization header, invalid token or expired token (TOKEN_EXPIRED)");
const adminOnly = error("Authenticated user is not ADMIN");
const bodyErrors = {
    413: error("Request body is larger than 100 kB (PAYLOAD_TOO_LARGE)"),
    415: error("Unsupported request body charset or encoding (UNSUPPORTED_MEDIA_TYPE)")
};

export const openapiDocument = {
    openapi: "3.0.3",
    info: {
        title: "Room Booking API",
        version: "1.0.0",
        description: "Rezerwacja sal. Zaloguj się przez POST /api/auth/login, a token wklej w Authorize."
    },
    tags: [
        { name: "Auth" },
        { name: "Buildings" },
        { name: "Rooms" },
        { name: "Reservations" },
        { name: "Admin" }
    ],
    security: [{ bearerAuth: [] }],
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
        },
        schemas: {
            Error: {
                type: "object",
                required: ["error"],
                properties: {
                    error: {
                        type: "object",
                        required: ["code", "message", "requestId"],
                        properties: {
                            code: { type: "string", example: "VALIDATION_ERROR" },
                            message: { type: "string", example: "Validation failed" },
                            details: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        location: { type: "string", enum: ["params", "query", "body"] },
                                        field: { type: "string", example: "password" },
                                        message: { type: "string", example: "Password must have at least 10 characters" }
                                    }
                                }
                            },
                            requestId: { type: "string", example: "3f1c2b4e-8a9d-4e6f-9b1a-2c3d4e5f6a7b" }
                        }
                    }
                }
            },
            RegisterRequest: {
                type: "object",
                required: ["email", "password"],
                additionalProperties: false,
                properties: {
                    email: { type: "string", format: "email", maxLength: 254, example: "Jan.Kowalski@example.com" },
                    password: { type: "string", minLength: 10, maxLength: 72, example: "bardzo-dlugie-haslo" }
                }
            },
            LoginRequest: {
                type: "object",
                required: ["email", "password"],
                additionalProperties: false,
                properties: {
                    email: { type: "string", format: "email", maxLength: 254, example: "admin@example.com" },
                    password: { type: "string", minLength: 1, example: "admin-password-123" }
                }
            },
            LoginResponse: {
                type: "object",
                properties: {
                    accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    tokenType: { type: "string", example: "Bearer" },
                    expiresIn: { type: "string", example: "15m" }
                }
            },
            User: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 2 },
                    email: { type: "string", example: "jan.kowalski@example.com" },
                    role: { type: "string", enum: ["USER", "ADMIN"] },
                    createdAt: { type: "string", format: "date-time" }
                }
            },
            Building: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Budynek A" },
                    address: { type: "string", example: "ul. Warszawska 24, Kraków" },
                    roomsCount: { type: "integer", example: 3 }
                }
            },
            CreateBuildingRequest: {
                type: "object",
                required: ["name", "address"],
                additionalProperties: false,
                properties: {
                    name: { type: "string", minLength: 1, maxLength: 100, example: "Budynek D" },
                    address: { type: "string", minLength: 3, maxLength: 200, example: "ul. Reymonta 7, Kraków" }
                }
            },
            Room: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "101" },
                    capacity: { type: "integer", example: 30 },
                    building: {
                        type: "object",
                        properties: { id: { type: "integer", example: 1 }, name: { type: "string", example: "Budynek A" } }
                    }
                }
            },
            CreateRoomRequest: {
                type: "object",
                required: ["buildingId", "name", "capacity"],
                additionalProperties: false,
                properties: {
                    buildingId: { type: "integer", minimum: 1, maximum: INT_MAX, example: 3 },
                    name: { type: "string", minLength: 1, maxLength: 50, example: "301" },
                    capacity: { type: "integer", minimum: 1, maximum: INT_MAX, example: 20 }
                }
            },
            Reservation: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    room: {
                        type: "object",
                        properties: {
                            id: { type: "integer", example: 1 },
                            name: { type: "string", example: "101" },
                            building: {
                                type: "object",
                                properties: { id: { type: "integer", example: 1 }, name: { type: "string", example: "Budynek A" } }
                            }
                        }
                    },
                    user: {
                        type: "object",
                        properties: { id: { type: "integer", example: 2 }, email: { type: "string", example: "jan.kowalski@example.com" } }
                    },
                    participants: { type: "integer", example: 20 },
                    startTime: { type: "string", format: "date-time" },
                    endTime: { type: "string", format: "date-time" },
                    status: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
                    createdAt: { type: "string", format: "date-time" },
                    cancelledAt: { type: "string", format: "date-time", nullable: true }
                }
            },
            CreateReservationRequest: {
                type: "object",
                required: ["roomId", "participants", "startTime", "endTime"],
                additionalProperties: false,
                properties: {
                    roomId: { type: "integer", minimum: 1, maximum: INT_MAX, example: 3 },
                    participants: { type: "integer", minimum: 1, maximum: INT_MAX, example: 10 },
                    startTime: { type: "string", format: "date-time", example: "2026-12-01T10:00:00Z" },
                    endTime: { type: "string", format: "date-time", example: "2026-12-01T11:00:00Z" }
                }
            },
            ReservationList: {
                type: "object",
                properties: {
                    data: { type: "array", items: schema("Reservation") },
                    meta: schema("PageMeta")
                }
            },
            PageMeta: {
                type: "object",
                properties: {
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 20 },
                    total: { type: "integer", example: 5 },
                    totalPages: { type: "integer", example: 1 }
                }
            },
            AuditLogEntry: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 2 },
                    eventType: { type: "string", enum: ["reservation.created", "reservation.cancelled"] },
                    payload: {
                        type: "object",
                        description: "reservation.created: reservationId, roomId, userId, startTime, endTime; reservation.cancelled: reservationId, roomId, userId, cancelledBy",
                        example: { reservationId: 6, roomId: 3, userId: 2, cancelledBy: 1 }
                    },
                    createdAt: { type: "string", format: "date-time" }
                }
            },
            AuditLogList: {
                type: "object",
                properties: {
                    data: { type: "array", items: schema("AuditLogEntry") },
                    meta: schema("PageMeta")
                }
            }
        }
    },
    paths: {
        "/api/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Register a new USER account",
                security: [],
                requestBody: body("RegisterRequest"),
                responses: {
                    201: success("Created user (role is always USER)", schema("User")),
                    400: invalidInput,
                    409: error("Email already registered (EMAIL_TAKEN)"),
                    ...bodyErrors
                }
            }
        },
        "/api/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Log in and get a JWT access token",
                security: [],
                requestBody: body("LoginRequest"),
                responses: {
                    200: success("Access token", schema("LoginResponse")),
                    400: invalidInput,
                    401: error("Invalid email or password (INVALID_CREDENTIALS)"),
                    ...bodyErrors
                }
            }
        },
        "/api/auth/me": {
            get: {
                tags: ["Auth"],
                summary: "Get the logged in user",
                responses: {
                    200: success("Logged in user", schema("User")),
                    401: unauthorized,
                    404: error("User from the token no longer exists")
                }
            }
        },
        "/api/buildings": {
            get: {
                tags: ["Buildings"],
                summary: "List buildings with rooms count",
                responses: {
                    200: success("Buildings", { type: "array", items: schema("Building") }),
                    401: unauthorized
                }
            },
            post: {
                tags: ["Buildings"],
                summary: "Create a building (ADMIN)",
                requestBody: body("CreateBuildingRequest"),
                responses: {
                    201: success("Created building", schema("Building")),
                    400: invalidInput,
                    401: unauthorized,
                    403: adminOnly,
                    409: error("Building with this name already exists (UNIQUE_VIOLATION)"),
                    ...bodyErrors
                }
            }
        },
        "/api/buildings/{id}": {
            get: {
                tags: ["Buildings"],
                summary: "Get a building",
                parameters: [idParam("Building ID")],
                responses: {
                    200: success("Building", schema("Building")),
                    400: invalidInput,
                    401: unauthorized,
                    404: error("Building not found")
                }
            }
        },
        "/api/buildings/{id}/rooms": {
            get: {
                tags: ["Buildings"],
                summary: "List rooms in a building",
                parameters: [idParam("Building ID")],
                responses: {
                    200: success("Rooms in the building", { type: "array", items: schema("Room") }),
                    400: invalidInput,
                    401: unauthorized,
                    404: error("Building not found")
                }
            }
        },
        "/api/rooms": {
            get: {
                tags: ["Rooms"],
                summary: "List rooms",
                responses: {
                    200: success("Rooms", { type: "array", items: schema("Room") }),
                    401: unauthorized
                }
            },
            post: {
                tags: ["Rooms"],
                summary: "Create a room in a building (ADMIN)",
                requestBody: body("CreateRoomRequest"),
                responses: {
                    201: success("Created room", schema("Room")),
                    400: invalidInput,
                    401: unauthorized,
                    403: adminOnly,
                    404: error("Building not found"),
                    409: error("Room with this name already exists in the building (UNIQUE_VIOLATION)"),
                    ...bodyErrors
                }
            }
        },
        "/api/rooms/{id}": {
            get: {
                tags: ["Rooms"],
                summary: "Get a room",
                parameters: [idParam("Room ID")],
                responses: {
                    200: success("Room", schema("Room")),
                    400: invalidInput,
                    401: unauthorized,
                    404: error("Room not found")
                }
            }
        },
        "/api/reservations": {
            get: {
                tags: ["Reservations"],
                summary: "List reservations (USER sees only own reservations, ADMIN sees all)",
                parameters: [
                    queryParam("roomId", "Filter by room", { type: "integer", minimum: 1, maximum: INT_MAX }),
                    queryParam("buildingId", "Filter by building", { type: "integer", minimum: 1, maximum: INT_MAX }),
                    queryParam("userId", "Filter by user (ADMIN only, USER gets 403)", { type: "integer", minimum: 1, maximum: INT_MAX }),
                    queryParam("status", "Filter by status", { type: "string", enum: ["CONFIRMED", "CANCELLED"] }),
                    queryParam("from", "Reservations ending after this time", { type: "string", format: "date-time" }),
                    queryParam("to", "Reservations starting before this time", { type: "string", format: "date-time" }),
                    queryParam("page", "Page number", { type: "integer", minimum: 1, maximum: INT_MAX, default: 1 }),
                    queryParam("limit", "Page size", { type: "integer", minimum: 1, maximum: 100, default: 20 }),
                    queryParam("sort", "Sort field, - means descending", {
                        type: "string",
                        enum: ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"],
                        default: "startTime"
                    })
                ],
                responses: {
                    200: success("Page of reservations", schema("ReservationList")),
                    400: invalidInput,
                    401: unauthorized,
                    403: error("userId filter used by USER")
                }
            },
            post: {
                tags: ["Reservations"],
                summary: "Create a reservation for the logged in user",
                requestBody: body("CreateReservationRequest"),
                responses: {
                    201: success("Created reservation", schema("Reservation")),
                    400: error("Validation error, e.g. userId or reservedBy in body, start in the past, duration outside 15 min - 8 h"),
                    401: unauthorized,
                    404: error("Room not found"),
                    409: error("Room capacity exceeded (CAPACITY_EXCEEDED), room already booked (ROOM_ALREADY_BOOKED), concurrent conflict (CONCURRENT_CONFLICT) or user from the token no longer exists (FOREIGN_KEY_VIOLATION)"),
                    ...bodyErrors
                }
            }
        },
        "/api/reservations/{id}": {
            get: {
                tags: ["Reservations"],
                summary: "Get a reservation (owner or ADMIN)",
                parameters: [idParam("Reservation ID")],
                responses: {
                    200: success("Reservation", schema("Reservation")),
                    400: invalidInput,
                    401: unauthorized,
                    404: error("Reservation not found or owned by another user")
                }
            }
        },
        "/api/reservations/{id}/cancel": {
            patch: {
                tags: ["Reservations"],
                summary: "Cancel a reservation (owner or ADMIN)",
                parameters: [idParam("Reservation ID")],
                responses: {
                    200: success("Cancelled reservation", schema("Reservation")),
                    400: invalidInput,
                    401: unauthorized,
                    404: error("Reservation not found or owned by another user"),
                    409: error("Reservation has already started (RESERVATION_ALREADY_STARTED)")
                }
            }
        },
        "/api/admin/audit-log": {
            get: {
                tags: ["Admin"],
                summary: "List audit log entries, newest first (ADMIN)",
                parameters: [
                    queryParam("eventType", "Filter by event type", { type: "string", example: "reservation.cancelled" }),
                    queryParam("page", "Page number", { type: "integer", minimum: 1, maximum: INT_MAX, default: 1 }),
                    queryParam("limit", "Page size", { type: "integer", minimum: 1, maximum: 100, default: 20 })
                ],
                responses: {
                    200: success("Page of audit log entries", schema("AuditLogList")),
                    400: invalidInput,
                    401: unauthorized,
                    403: adminOnly
                }
            }
        }
    }
};
