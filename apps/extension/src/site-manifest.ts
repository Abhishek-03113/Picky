import { siteHostPermissions, supportedStoresText } from "@picky/catalog/sites";
import type { StoreManifest } from "./store-compliance.ts";

/** Placeholder in public/manifest.json's description, replaced with the store list at build time. */
export const STORES_PLACEHOLDER = "{stores}";
const LINK_CONTENT_SCRIPT = "link-alt-click.js";

/**
 * Fills the store-dependent manifest fields from the shopping-site registry, so adding a site needs no
 * manifest edit: the description's store list, a host permission per store (to fetch product links) and
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
        ? manifest.description.replace(STORES_PLACEHOLDER, supportedStoresText())
        : manifest.description,
    host_permissions: [...new Set([...storeOrigins, ...(manifest.host_permissions ?? [])])],
    content_scripts: (manifest.content_scripts ?? []).map((script) =>
      script.js.includes(LINK_CONTENT_SCRIPT) ? { ...script, matches: storeOrigins } : script,
    ),
  };
}
