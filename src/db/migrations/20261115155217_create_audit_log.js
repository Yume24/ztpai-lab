export async function up(knex) {
    await knex.schema.createTable("audit_log", table => {
        table.bigIncrements("id");
        table.string("event_type", 100).notNullable();
        table.jsonb("payload").notNullable();
        table.timestamp("created_at", { useTz: true }).notNullable();
        table.index("created_at");
        table.index(["event_type", "created_at"]);
    });
}

export async function down(knex) {
    await knex.schema.dropTable("audit_log");
}
