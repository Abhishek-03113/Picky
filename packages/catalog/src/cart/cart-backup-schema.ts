import { z } from "zod";
import { ProductSnapshotSchema } from "../product-snapshot-schema.ts";

/** The `format` tag every Picky backup file carries. */
export const CART_BACKUP_FORMAT = "picky-backup";
/** The newest backup version this code reads and writes. */
export const CART_BACKUP_VERSION = 1;

// product-snapshot-schema.ts re-exports this file, so the two import each other; z.lazy defers reading
// ProductSnapshotSchema until a parse runs, by when both modules have finished loading.
const SnapshotSchema = z.lazy(() => ProductSnapshotSchema);

export const CartBackupItemSchema = z.object({
  snapshot: SnapshotSchema,
  quantity: z.number().int().min(1).max(99),
  note: z.string().nullable(),
});

export const CartBackupCartSchema = z.object({
  name: z.string().trim().min(1).max(120),
  items: z.array(CartBackupItemSchema),
});

export const CartBackupComparisonSchema = z.object({
  name: z.string().trim().min(1).max(120),
  snapshots: z.array(SnapshotSchema),
});

/**
 * Validates a Picky backup file (GET /api/backup, GET /api/carts/:id/export?format=json): carts with
 * their full snapshots, and optionally comparisons and loose library products.
 *
 * @example CartBackupV1Schema.parse(JSON.parse(await file.text())).carts[0]?.items.length
 */
export const CartBackupV1Schema = z.object({
  format: z.literal(CART_BACKUP_FORMAT),
  version: z.literal(CART_BACKUP_VERSION),
  exportedAt: z.iso.datetime(),
  carts: z.array(CartBackupCartSchema),
  comparisons: z.array(CartBackupComparisonSchema).optional(),
  products: z.array(SnapshotSchema).optional(),
});

/** A Picky backup file, version 1. */
export type CartBackupV1 = z.infer<typeof CartBackupV1Schema>;
