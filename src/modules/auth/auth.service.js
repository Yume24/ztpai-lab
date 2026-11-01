import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../errors/AppError.js";
import { Role } from "../users/users.roles.js";
import { hashPassword, verifyPassword } from "./password.js";

const DUMMY_PASSWORD_HASH = await hashPassword(randomUUID());

export class AuthService {
    constructor({ runInTransaction, jwtSecret, jwtExpiresIn }) {
        this.runInTransaction = runInTransaction;
        this.jwtSecret = jwtSecret;
        this.jwtExpiresIn = jwtExpiresIn;
    }

    async register({ email, password }) {
        const existing = await this.runInTransaction(({ usersRepository }) => usersRepository.getUserByEmail(email));
        if (existing) throw new ConflictError("Email already registered", "EMAIL_TAKEN");

        const passwordHash = await hashPassword(password);

        return this.runInTransaction(({ usersRepository }) =>
            usersRepository.createUser({ email, passwordHash, role: Role.USER }));
    }

    async login({ email, password }) {
        const user = await this.runInTransaction(({ usersRepository }) => usersRepository.getUserByEmail(email));

        const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
        if (!user || !passwordOk) throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");

        const accessToken = jwt.sign({ role: user.role }, this.jwtSecret, {
            algorithm: "HS256",
            subject: String(user.id),
            expiresIn: this.jwtExpiresIn
        });

        return { accessToken, tokenType: "Bearer", expiresIn: this.jwtExpiresIn };
    }

    async getCurrentUser(id) {
        return this.runInTransaction(async ({ usersRepository }) => {
            const user = await usersRepository.getUserById(id);
            if (!user) throw new NotFoundError("User");
            return user;
        });
    }
}
