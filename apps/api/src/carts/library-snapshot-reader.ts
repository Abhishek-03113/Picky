import type { ProductSnapshot } from "@picky/catalog";

/** Reads a user's whole library as snapshots, for a backup file. Kept apart from ProductRepository's capped list. */
export interface LibrarySnapshotReader {
  /** Every product the user has, oldest first, so a restore recreates them in the order they were saved. */
  listSnapshots(userId: string): Promise<ProductSnapshot[]>;
}
