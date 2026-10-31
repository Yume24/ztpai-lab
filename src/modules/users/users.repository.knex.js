function toUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        createdAt: row.created_at
    };
}

export class KnexUsersRepository {
    constructor(db) {
        this.db = db;
    }

    async getUserById(id) {
        return toUser(await this.db("users").where({ id }).first());
    }

    async getUserByEmail(email) {
        return toUser(await this.db("users").where({ email }).first());
    }

    async createUser({ email, passwordHash, role }) {
        const [row] = await this.db("users")
            .insert({ email, password_hash: passwordHash, role })
            .returning("*");
        return toUser(row);
    }
}
