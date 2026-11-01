import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../errors/AppError.js";
import { Role } from "../modules/users/users.roles.js";

const BEARER = /^Bearer (\S+)$/i;

export function authenticate(jwtSecret) {
    return (req, res, next) => {
        const header = req.get("Authorization");
        if (!header) return next(new UnauthorizedError());

        const match = BEARER.exec(header);
        if (!match) return next(new UnauthorizedError("Authorization header must have the format: Bearer <token>"));

        let payload;
        try {
            payload = jwt.verify(match[1], jwtSecret, { algorithms: ["HS256"] });
        } catch (err) {
            return next(err.name === "TokenExpiredError"
                ? new UnauthorizedError("Token expired", "TOKEN_EXPIRED")
                : new UnauthorizedError("Invalid token"));
        }

        const id = Number(payload.sub);
        if (!Number.isInteger(id) || !Object.values(Role).includes(payload.role)) {
            return next(new UnauthorizedError("Invalid token"));
        }

        req.user = { id, role: payload.role };
        next();
    };
}
