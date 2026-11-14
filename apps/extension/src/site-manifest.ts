import { siteHostPermissions, storeBrandsText } from "@picky/catalog/sites";
import { optionalStoreSites, requiredStoreSites, STORE_CONTENT_SCRIPTS } from "./permissions/store-sites.ts";
import type { StoreManifest } from "./store-compliance.ts";

/**
 * Placeholder in public/manifest.json's description, replaced at build time with the required stores'
 * brands ("Amazon and Flipkart"): the Web Store summary names brands, not each Amazon site, and leaves beta
 * stores out so it stays within the store's 132 characters.
 */
export const BRANDS_PLACEHOLDER = "{brands}";
const STORE_SCRIPTS: ReadonlySet<string> = new Set(STORE_CONTENT_SCRIPTS);

/**
 * Fills the store-dependent manifest fields from the shopping-site registry, so adding a site needs no
 * manifest edit: the description's brand list, a host permission per store (to fetch product links) and
 * the stores the Alt+click and Save pill content scripts run on. Beta stores become optional host
 * permissions, asked for the first time Picky needs them there (permissions/store-permissions.ts); the
 * declared content scripts keep to the required stores, and store-scripts.ts adds them for allowed ones.
 *
 * @example withSiteFields(template).host_permissions // ["https://www.amazon.in/*", …]
 * @example withSiteFields(template).optional_host_permissions // ["https://www.walmart.com/*", …]
 */
export function withSiteFields<Manifest extends StoreManifest>(manifest: Manifest): Manifest {
  const requiredSites = requiredStoreSites();
  const requiredOrigins = siteHostPermissions(requiredSites);
  const optionalOrigins = siteHostPermissions(optionalStoreSites());
  return {
    ...manifest,
    description:
      typeof manifest.description === "string"
        ? manifest.description.replace(BRANDS_PLACEHOLDER, storeBrandsText("and", requiredSites))
        : manifest.description,
    host_permissions: [...new Set([...requiredOrigins, ...(manifest.host_permissions ?? [])])],
    optional_host_permissions: [...new Set([...optionalOrigins, ...(manifest.optional_host_permissions ?? [])])],
    content_scripts: (manifest.content_scripts ?? []).map((script) =>
      script.js.some((file) => STORE_SCRIPTS.has(file)) ? { ...script, matches: requiredOrigins } : script,
    ),
  };
}
