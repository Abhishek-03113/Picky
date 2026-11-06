import { SHOPPING_SITES, siteHostPermissions, storeBrandsText } from "@picky/catalog/sites";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { BRANDS_PLACEHOLDER, withSiteFields } from "../src/site-manifest.ts";
import type { StoreManifest } from "../src/store-compliance.ts";

const readTemplate = async () =>
  (await Bun.file(join(import.meta.dir, "../public/manifest.json")).json()) as StoreManifest;

describe("withSiteFields", () => {
  test("the checked-in manifest leaves every store-dependent field to the registry", async () => {
    const template = await readTemplate();
    expect(template.description).toContain(BRANDS_PLACEHOLDER);
    expect(template.host_permissions).toEqual([]);
    expect(template.content_scripts?.[0]?.matches).toEqual([]);
  });

  test("fills the description with the brands, and host permissions and Alt+click matches for every store", async () => {
    const manifest = withSiteFields(await readTemplate());
    expect(manifest.description).toContain(storeBrandsText());
    expect(manifest.description).not.toContain(BRANDS_PLACEHOLDER);
    expect(manifest.host_permissions).toEqual(siteHostPermissions());
    expect(manifest.host_permissions).toHaveLength(SHOPPING_SITES.length);
    expect(manifest.content_scripts?.[0]).toEqual({
      matches: siteHostPermissions(),
      js: ["link-alt-click.js"],
      run_at: "document_idle",
    } as never);
  });

  test("keeps other host permissions and content scripts as they are", () => {
    const bridge = { matches: ["https://picky.example/*"], js: ["web-bridge.js"] };
    const manifest = withSiteFields({ host_permissions: ["https://api.example/*"], content_scripts: [bridge] });
    expect(manifest.host_permissions).toEqual([...siteHostPermissions(), "https://api.example/*"]);
    expect(manifest.content_scripts).toEqual([bridge]);
  });
});
