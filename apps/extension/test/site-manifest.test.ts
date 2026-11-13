import { SHOPPING_SITES, siteHostPermissions } from "@picky/catalog/sites";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { optionalStoreSites, requiredStoreSites } from "../src/permissions/store-sites.ts";
import { BRANDS_PLACEHOLDER, withSiteFields } from "../src/site-manifest.ts";
import type { StoreManifest } from "../src/store-compliance.ts";

/** The Chrome Web Store rejects a longer description (store-compliance.ts). */
const DESCRIPTION_MAX = 132;

const readTemplate = async () =>
  (await Bun.file(join(import.meta.dir, "../public/manifest.json")).json()) as StoreManifest;

describe("withSiteFields", () => {
  test("the checked-in manifest leaves every store-dependent field to the registry", async () => {
    const template = await readTemplate();
    expect(template.description).toContain(BRANDS_PLACEHOLDER);
    expect(template.host_permissions).toEqual([]);
    expect(template.optional_host_permissions).toEqual([]);
    expect(template.content_scripts?.[0]?.matches).toEqual([]);
  });

  test("requires Amazon and Flipkart at install and leaves the beta stores optional", async () => {
    const manifest = withSiteFields(await readTemplate());
    expect(manifest.host_permissions).toEqual(siteHostPermissions(requiredStoreSites()));
    expect(manifest.optional_host_permissions).toEqual(siteHostPermissions(optionalStoreSites()));
    expect(requiredStoreSites().map((site) => site.brand)).toEqual(["Amazon", "Amazon", "Flipkart"]);
    expect(optionalStoreSites().map((site) => site.brand)).toEqual(["Walmart", "Target", "Best Buy", "eBay", "Etsy"]);
    // Every store is reachable one way or the other, and none is both.
    expect(manifest.host_permissions).toHaveLength(requiredStoreSites().length);
    expect(manifest.optional_host_permissions).toHaveLength(optionalStoreSites().length);
    expect(requiredStoreSites().length + optionalStoreSites().length).toBe(SHOPPING_SITES.length);
  });

  test("names only Amazon and Flipkart in the description, within the Web Store's 132 characters", async () => {
    const description = String(withSiteFields(await readTemplate()).description);
    expect(description).toContain("Amazon and Flipkart");
    expect(description).not.toContain(BRANDS_PLACEHOLDER);
    for (const site of optionalStoreSites()) expect(description).not.toContain(site.brand);
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  test("runs the Alt+click script on the required stores only; beta stores get it once allowed", async () => {
    const manifest = withSiteFields(await readTemplate());
    expect(manifest.content_scripts?.[0]).toEqual({
      matches: siteHostPermissions(requiredStoreSites()),
      js: ["link-alt-click.js"],
      run_at: "document_idle",
    } as never);
  });

  test("keeps other host permissions and content scripts as they are", () => {
    const bridge = { matches: ["https://picky.example/*"], js: ["web-bridge.js"] };
    const manifest = withSiteFields({ host_permissions: ["https://api.example/*"], content_scripts: [bridge] });
    expect(manifest.host_permissions).toEqual([...siteHostPermissions(requiredStoreSites()), "https://api.example/*"]);
    expect(manifest.content_scripts).toEqual([bridge]);
  });
});
