import type { ProductSnapshot } from "@picky/catalog";
import type { LibrarySnapshotReader } from "../../src/carts/library-snapshot-reader.ts";
import type { InMemoryProductRepository } from "./in-memory-product-repository.ts";

/** LibrarySnapshotReader over the in-memory products, oldest first like the real one. */
export class InMemoryLibrarySnapshotReader implements LibrarySnapshotReader {
  constructor(private readonly products: InMemoryProductRepository) {}

  async listSnapshots(userId: string): Promise<ProductSnapshot[]> {
    return this.products.listOwnedProducts(userId).map((product) => product.snapshot);
  }
}
