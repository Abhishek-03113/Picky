import type { ProductSnapshot } from "@picky/catalog";

/** Fields added to ProductSnapshot after rows were already stored; old rows lack the keys. */
type AddedLater = "category" | "sizeCharts" | "colorOptions";

/** A snapshot as the products table holds it: rows saved before a field existed do not have it. */
export type StoredSnapshot = Omit<ProductSnapshot, AddedLater> & Partial<Pick<ProductSnapshot, AddedLater>>;

/**
 * Reads a stored snapshot as a current ProductSnapshot, filling fields that older rows lack with the same
 * defaults ProductSnapshotSchema gives new submissions. Without it the web app's colour and size-chart cards
 * would get `undefined` for every product saved before those fields existed.
 *
 * @example fromStoredSnapshot(row.snapshot).colorOptions // [] for a row saved before colours existed
 */
export function fromStoredSnapshot(stored: StoredSnapshot): ProductSnapshot {
  return {
    ...stored,
    category: stored.category ?? null,
    sizeCharts: stored.sizeCharts ?? [],
    colorOptions: stored.colorOptions ?? [],
  };
}
