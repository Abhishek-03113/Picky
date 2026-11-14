import { describe, expect, test } from "bun:test";
import { InvalidSnapshotError, ProductIngestion } from "../src/products/product-ingestion.ts";
import { InMemoryPriceObservationRepository } from "./fakes/in-memory-price-observation-repository.ts";
import { InMemoryProductRepository } from "./fakes/in-memory-product-repository.ts";
import { buildSampleSnapshot } from "./support/sample-snapshot.ts";

const USER_ID = "user-1";

function createIngestion() {
  const repository = new InMemoryProductRepository();
  return {
    repository,
    ingestion: new ProductIngestion(repository, new InMemoryPriceObservationRepository(repository)),
  };
}

describe("ProductIngestion.ingestSnapshot", () => {
  test("stores a valid snapshot in the user's library only", async () => {
    const { ingestion, repository } = createIngestion();
    const product = await ingestion.ingestSnapshot(USER_ID, buildSampleSnapshot());
    expect(await repository.findProductById(USER_ID, product.id)).toEqual(product);
    expect(await repository.findProductById("user-2", product.id)).toBeNull();
  });

  test("accepts a snapshot from an extension older than size charts and colours, defaulting both to []", async () => {
    const { ingestion } = createIngestion();
    const { sizeCharts: _charts, colorOptions: _colors, ...older } = buildSampleSnapshot();
    const product = await ingestion.ingestSnapshot(USER_ID, older);
    expect(product.snapshot.sizeCharts).toEqual([]);
    expect(product.snapshot.colorOptions).toEqual([]);
  });

  test("lists each failing path in the error", async () => {
    const { ingestion } = createIngestion();
    const rejected = ingestion.ingestSnapshot(USER_ID, { ...buildSampleSnapshot(), title: "", source: "ebay" });
    await expect(rejected).rejects.toThrow(InvalidSnapshotError);
    await expect(rejected).rejects.toThrow(/source: .*; title: /);
  });
});
