import { SHOPPING_SITES } from "@picky/catalog/sites";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

// Store copy the build cannot fill in from the site registry. When a store is added, these must be
// updated by hand (docs/adding-a-site.md, step 4); this test is the reminder. The listing names each
// store; the promo tile only has room for the brands ("Amazon", not Amazon.in and Amazon.com).
const HAND_WRITTEN_COPY = [
  { path: "../../../docs/chrome-web-store.md", names: SHOPPING_SITES.map((site) => site.label) },
  { path: "../store/promo.html", names: [...new Set(SHOPPING_SITES.map((site) => site.brand))] },
];

describe.each(HAND_WRITTEN_COPY)("$path", ({ path, names }) => {
  test("names every supported store", async () => {
    const text = await Bun.file(join(import.meta.dir, path)).text();
    expect(names.filter((name) => !text.includes(name))).toEqual([]);
  });
});
