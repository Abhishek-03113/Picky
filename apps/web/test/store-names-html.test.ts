import { supportedStoresText } from "@picky/catalog/sites";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { STORES_MARKER, withStoreNames } from "../store-names-html.ts";

describe("store names in index.html", () => {
  test("index.html names the stores through the marker, not by hand", async () => {
    const html = await Bun.file(join(import.meta.dir, "../index.html")).text();
    expect(html).toContain(STORES_MARKER);
    expect(withStoreNames(html)).toContain(`as you browse ${supportedStoresText()},`);
    expect(withStoreNames(html)).not.toContain(STORES_MARKER);
  });
});
