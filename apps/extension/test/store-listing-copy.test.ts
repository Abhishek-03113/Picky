import { SHOPPING_SITES, shoppingStores, siteDomain } from "@picky/catalog/sites";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

// Store copy the build cannot fill in from the site registry. When a store or storefront is added, these
// must be updated by hand (docs/adding-a-site.md, step 4); this test is the reminder. The listing names
// every domain the extension can reach; the promo tile only has room for store names ("Amazon").
const HAND_WRITTEN_COPY = [
  { path: "../../../docs/chrome-web-store.md", names: SHOPPING_SITES.map(siteDomain) },
  { path: "../store/promo.html", names: shoppingStores().map((store) => store.name) },
];

describe.each(HAND_WRITTEN_COPY)("$path", ({ path, names }) => {
  test("names every supported store", async () => {
    const text = await Bun.file(join(import.meta.dir, path)).text();
    expect(names.filter((name) => !text.includes(name))).toEqual([]);
  });
});
