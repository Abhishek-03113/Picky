import { SHOPPING_SITES } from "@picky/catalog/sites";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

// Store copy the build cannot fill in from the site registry. When a store is added, these must be
// updated by hand (docs/adding-a-site.md, step 4); this test is the reminder.
const HAND_WRITTEN_COPY = ["../../../docs/chrome-web-store.md", "../store/promo.html"] as const;

describe.each(HAND_WRITTEN_COPY)("%s", (path) => {
  test("names every supported store", async () => {
    const text = await Bun.file(join(import.meta.dir, path)).text();
    const missing = SHOPPING_SITES.filter((site) => !text.includes(site.label)).map((site) => site.label);
    expect(missing).toEqual([]);
  });
});
