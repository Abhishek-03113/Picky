import { siteHostPermissions, storeBrandsText } from "@picky/catalog/sites";
import type { StoreManifest } from "./store-compliance.ts";

/**
 * Placeholder in public/manifest.json's description, replaced at build time with the store brands
 * ("Amazon and Flipkart"): the Web Store summary names brands, not each Amazon site.
 */
export const BRANDS_PLACEHOLDER = "{brands}";
const LINK_CONTENT_SCRIPT = "link-alt-click.js";

/**
 * Fills the store-dependent manifest fields from the shopping-site registry, so adding a site needs no
 * manifest edit: the description's brand list, a host permission per store (to fetch product links) and
 * the stores the Alt+click content script runs on.
 *
 * @example withSiteFields(template).host_permissions // ["https://www.amazon.in/*", …]
 */
export function withSiteFields<Manifest extends StoreManifest>(manifest: Manifest): Manifest {
  const storeOrigins = siteHostPermissions();
  return {
    ...manifest,
    description:
      typeof manifest.description === "string"
        ? manifest.description.replace(BRANDS_PLACEHOLDER, storeBrandsText())
        : manifest.description,
    host_permissions: [...new Set([...storeOrigins, ...(manifest.host_permissions ?? [])])],
    content_scripts: (manifest.content_scripts ?? []).map((script) =>
      script.js.includes(LINK_CONTENT_SCRIPT) ? { ...script, matches: storeOrigins } : script,
    ),
  };
}
