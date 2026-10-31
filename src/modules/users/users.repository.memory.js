import { ConflictError } from "../../errors/AppError.js";

export class InMemoryUsersRepository {
    constructor(store) {
        this.store = store;
    }

    async getUserById(id) {
        const user = this.store.users.get(id);
        return user ? { ...user } : null;
    }

    async getUserByEmail(email) {
        const user = [...this.store.users.values()].find(user => user.email === email);
        return user ? { ...user } : null;
    }

    async createUser({ email, passwordHash, role }) {
        if ([...this.store.users.values()].some(user => user.email === email)) {
            throw new ConflictError("Email already registered", "EMAIL_TAKEN");
        }

        const user = { id: nextId(this.store.users), email, passwordHash, role, createdAt: new Date() };
        this.store.users.set(user.id, user);
        return { ...user };
    }
}

function nextId(map) {
    return Math.max(0, ...map.keys()) + 1;
}
