import type { SQL } from "bun";
import type { ProductSnapshot } from "@picky/catalog";
import { fromStoredSnapshot, type StoredSnapshot } from "../products/stored-snapshot.ts";
import type { LibrarySnapshotReader } from "./library-snapshot-reader.ts";

/**
 * LibrarySnapshotReader on Postgres via Bun's built-in SQL client.
 *
 * @example await new PostgresLibrarySnapshotReader(sql).listSnapshots(userId)
 */
export class PostgresLibrarySnapshotReader implements LibrarySnapshotReader {
  constructor(private readonly sql: SQL) {}

  async listSnapshots(userId: string): Promise<ProductSnapshot[]> {
    const rows: { snapshot: StoredSnapshot }[] = await this.sql`
      SELECT snapshot FROM products WHERE user_id = ${userId} ORDER BY created_at, id`;
    return rows.map((row) => fromStoredSnapshot(row.snapshot));
  }
}
