import { ConflictError } from "../../errors/AppError.js";
import { Role } from "../users/users.roles.js";
import { hashPassword } from "./password.js";

export class AuthService {
    constructor({ runInTransaction }) {
        this.runInTransaction = runInTransaction;
    }

    async register({ email, password }) {
        const existing = await this.runInTransaction(({ usersRepository }) => usersRepository.getUserByEmail(email));
        if (existing) throw new ConflictError("Email already registered", "EMAIL_TAKEN");

        const passwordHash = await hashPassword(password);

        return this.runInTransaction(({ usersRepository }) =>
            usersRepository.createUser({ email, passwordHash, role: Role.USER }));
    }
}
