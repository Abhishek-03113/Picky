import type { CatalogCartDetail, CatalogCartSummary, CatalogComparisonDetail } from "@picky/catalog";
import { CART_BACKUP_FORMAT, CART_BACKUP_VERSION, type CartBackupV1 } from "@picky/catalog/schema";
import { z } from "zod";
import type { ComparisonRepository } from "../comparisons/comparison-repository.ts";
import { InvalidSnapshotError, type ProductIngestion } from "../products/product-ingestion.ts";
import type { CartMergeLine, CartMergeResult, CartRepository } from "./cart-repository.ts";
import type { LibrarySnapshotReader } from "./library-snapshot-reader.ts";

export interface CartBackupDependencies {
  carts: CartRepository;
  comparisons: ComparisonRepository;
  ingestion: ProductIngestion;
  library: LibrarySnapshotReader;
}

/** One line to import: the snapshot is validated (and stored in the importer's library) on the way in. */
export interface ImportLine {
  snapshot: unknown;
  quantity: number;
  note: string | null;
}

/** What POST /api/backup reports: rows written, and snapshots left out because they failed validation. */
export interface RestoreResult {
  products: number;
  comparisons: number;
  carts: number;
  skipped: number;
}

/** A backup body as restore reads it: the envelope is checked, each snapshot only when it is stored. */
export type LenientBackup = z.infer<typeof LenientBackupSchema>;

/** The result of reading a backup body: the backup, or the reason it cannot be restored. */
export type BackupReadResult = { ok: true; backup: LenientBackup } | { ok: false; reason: string };

const NameSchema = z.string().trim().min(1).max(120);
const QuantitySchema = z.number().int().min(1).max(99);

// Snapshots are `unknown` here so one stale product in an old file is skipped rather than failing the restore.
const LenientBackupSchema = z.object({
  format: z.literal(CART_BACKUP_FORMAT),
  version: z.literal(CART_BACKUP_VERSION),
  carts: z.array(
    z.object({
      name: NameSchema,
      items: z.array(z.object({ snapshot: z.unknown(), quantity: QuantitySchema, note: z.string().nullable() })),
    }),
  ),
  comparisons: z.array(z.object({ name: NameSchema, snapshots: z.array(z.unknown()) })).optional(),
  products: z.array(z.unknown()).optional(),
});

const VersionProbeSchema = z.object({ version: z.number() });

/**
 * Checks a backup body's envelope. A version newer than this server reads gets its own reason, so the
 * shopper knows to update rather than that the file is broken.
 *
 * @example const read = readBackup(body); if (!read.ok) throw new BadRequestError(read.reason)
 */
export function readBackup(candidate: unknown): BackupReadResult {
  const probe = VersionProbeSchema.safeParse(candidate);
  if (probe.success && probe.data.version > CART_BACKUP_VERSION) {
    return {
      ok: false,
      reason: `Backup version ${probe.data.version} is newer than this Picky reads (version ${CART_BACKUP_VERSION}); update Picky and try again`,
    };
  }
  const parsed = LenientBackupSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, backup: parsed.data };
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
  return { ok: false, reason: `Not a Picky backup file (${issues.join("; ")})` };
}

/**
 * The lines of every cart in a backup, in file order, for importing them into one cart.
 *
 * @example await importLines(deps, userId, { cartId: null, name: "Gifts" }, backupLines(backup))
 */
export function backupLines(backup: LenientBackup): ImportLine[] {
  return backup.carts.flatMap((cart) => cart.items);
}

/**
 * The user's whole account as a backup file: every cart, comparison and library product.
 *
 * @example c.json(await buildBackup(deps, userId, new Date()))
 */
export async function buildBackup(
  deps: Pick<CartBackupDependencies, "carts" | "comparisons" | "library">,
  userId: string,
  now: Date,
): Promise<CartBackupV1> {
  const cartSummaries = await deps.carts.listCarts(userId);
  const cartDetails = await Promise.all(cartSummaries.map((cart) => deps.carts.findCart(userId, cart.id)));
  const comparisonSummaries = await deps.comparisons.listComparisons(userId);
  const comparisonDetails = await Promise.all(
    comparisonSummaries.map((comparison) => deps.comparisons.findComparison(userId, comparison.id)),
  );
  return {
    ...backupEnvelope(now),
    carts: cartDetails.filter((cart): cart is CatalogCartDetail => cart !== null).map(toBackupCart),
    comparisons: comparisonDetails
      .filter((comparison): comparison is CatalogComparisonDetail => comparison !== null)
      .map((comparison) => ({
        name: comparison.name,
        snapshots: comparison.products.map((product) => product.snapshot),
      })),
    products: await deps.library.listSnapshots(userId),
  };
}

/**
 * One cart as a backup file (GET /api/carts/:id/export?format=json).
 *
 * @example buildCartExport(cart, new Date()).carts[0]?.name // "Diwali gifts"
 */
export function buildCartExport(cart: CatalogCartDetail, now: Date): CartBackupV1 {
  return { ...backupEnvelope(now), carts: [toBackupCart(cart)] };
}

/**
 * Stores the lines' snapshots in the user's library (deduped by store listing) and merges them into
 * `cartId`, or into a new cart named `name` when `cartId` is null. Null when `cartId` is not the user's.
 * Invalid snapshots are left out.
 *
 * @example await importLines(deps, userId, { cartId: null, name: "From Asha" }, lines) // { cart, added: 3, merged: 0 }
 */
export async function importLines(
  deps: Pick<CartBackupDependencies, "carts" | "ingestion">,
  userId: string,
  target: { cartId: string | null; name: string },
  lines: readonly ImportLine[],
): Promise<CartMergeResult | null> {
  const cartId = await resolveTargetCart(deps.carts, userId, target);
  if (cartId === null) return null;
  const store = snapshotStore(deps.ingestion, userId);
  return deps.carts.mergeItems(userId, cartId, await toMergeLines(store, lines));
}

/**
 * Restores a backup by merging: products upsert by store listing, and a comparison or cart whose name
 * matches one the user already has gains the backup's products instead of being duplicated.
 *
 * @example await restoreBackup(deps, userId, backup) // { products: 12, comparisons: 2, carts: 1, skipped: 0 }
 */
export async function restoreBackup(
  deps: CartBackupDependencies,
  userId: string,
  backup: LenientBackup,
): Promise<RestoreResult> {
  const store = snapshotStore(deps.ingestion, userId);
  for (const snapshot of backup.products ?? []) await store.save(snapshot);
  const comparisons = await restoreComparisons(deps.comparisons, userId, store, backup.comparisons ?? []);
  const carts = await restoreCarts(deps.carts, userId, store, backup.carts);
  return { products: store.productIds.size, comparisons, carts, skipped: store.skipped() };
}

interface SnapshotStore {
  /** The stored product's id, or null when the snapshot failed validation (counted as skipped). */
  save(snapshot: unknown): Promise<string | null>;
  productIds: Set<string>;
  skipped(): number;
}

function snapshotStore(ingestion: ProductIngestion, userId: string): SnapshotStore {
  const productIds = new Set<string>();
  let skipped = 0;
  return {
    productIds,
    skipped: () => skipped,
    async save(snapshot) {
      try {
        const product = await ingestion.ingestSnapshot(userId, snapshot);
        productIds.add(product.id);
        return product.id;
      } catch (error) {
        if (!(error instanceof InvalidSnapshotError)) throw error;
        skipped += 1;
        return null;
      }
    },
  };
}

async function toMergeLines(store: SnapshotStore, lines: readonly ImportLine[]): Promise<CartMergeLine[]> {
  const merged: CartMergeLine[] = [];
  for (const line of lines) {
    const productId = await store.save(line.snapshot);
    if (productId !== null) merged.push({ productId, quantity: line.quantity, note: line.note });
  }
  return merged;
}

async function resolveTargetCart(
  carts: CartRepository,
  userId: string,
  target: { cartId: string | null; name: string },
): Promise<string | null> {
  if (target.cartId === null) return (await carts.createCart(userId, target.name)).id;
  return (await carts.findCart(userId, target.cartId))?.id ?? null;
}

async function restoreComparisons(
  comparisons: ComparisonRepository,
  userId: string,
  store: SnapshotStore,
  entries: NonNullable<LenientBackup["comparisons"]>,
): Promise<number> {
  const existing = await comparisons.listComparisons(userId);
  for (const entry of entries) {
    const productIds: string[] = [];
    for (const snapshot of entry.snapshots) {
      const productId = await store.save(snapshot);
      if (productId !== null) productIds.push(productId);
    }
    const match = findByName(existing, entry.name);
    if (match === undefined) {
      existing.push(await comparisons.createComparison(userId, entry.name, productIds));
      continue;
    }
    for (const productId of productIds) await comparisons.addProduct(userId, match.id, productId);
  }
  return entries.length;
}

async function restoreCarts(
  carts: CartRepository,
  userId: string,
  store: SnapshotStore,
  entries: LenientBackup["carts"],
): Promise<number> {
  const existing: CatalogCartSummary[] = await carts.listCarts(userId);
  for (const entry of entries) {
    const lines = await toMergeLines(store, entry.items);
    const target = findByName(existing, entry.name) ?? (await carts.createCart(userId, entry.name));
    if (!existing.includes(target)) existing.push(target);
    await carts.mergeItems(userId, target.id, lines);
  }
  return entries.length;
}

function findByName<T extends { name: string }>(rows: readonly T[], name: string): T | undefined {
  const wanted = name.trim().toLowerCase();
  return rows.find((row) => row.name.trim().toLowerCase() === wanted);
}

function backupEnvelope(now: Date): Pick<CartBackupV1, "format" | "version" | "exportedAt"> {
  return { format: CART_BACKUP_FORMAT, version: CART_BACKUP_VERSION, exportedAt: now.toISOString() };
}

function toBackupCart(cart: CatalogCartDetail): CartBackupV1["carts"][number] {
  return {
    name: cart.name,
    items: cart.items.map((item) => ({
      snapshot: item.product.snapshot,
      quantity: item.quantity,
      note: item.note,
    })),
  };
}
