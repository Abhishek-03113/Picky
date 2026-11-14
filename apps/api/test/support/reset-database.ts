import type { SQL } from "bun";

/** Drops every table the migrations create, so the next `applyMigrations` starts from an empty database. */
export async function resetDatabase(sql: SQL): Promise<void> {
  await sql`DROP TABLE IF EXISTS
    price_observations, cart_shares, cart_items, carts,
    comparison_products, comparisons, products, sessions, users, schema_migrations`;
}
