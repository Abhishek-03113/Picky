import { SHOPPING_SITES, siteForUrl, siteHostPermissions, type SupportedSite } from "@picky/catalog/sites";

/**
 * The content scripts every store Picky can reach runs: Alt+click on product links and the Save pill.
 * The manifest declares them for the required stores; store-scripts.ts registers them at runtime for each
 * beta store the shopper allowed.
 */
export const STORE_CONTENT_SCRIPTS = ["link-alt-click.js", "save-pill.js"] as const;

/**
 * True for a store Picky asks access to the first time it is needed (decision D6): beta stores are
 * optional host permissions, so installing or updating Picky never asks for them up front.
 *
 * @example isOptionalStore(shoppingSite("walmart.com")) // true
 */
export function isOptionalStore(site: SupportedSite): boolean {
  return site.status === "beta";
}

/**
 * Stores whose host permission is required at install (Amazon storefronts, Flipkart).
 *
 * @example requiredStoreSites().map((site) => site.source) // ["amazon.in", "amazon.com", "flipkart.com"]
 */
export function requiredStoreSites(): SupportedSite[] {
  return SHOPPING_SITES.filter((site) => !isOptionalStore(site));
}

/**
 * Stores asked for one by one, when the shopper first needs Picky there.
 *
 * @example optionalStoreSites()[0]?.source // "walmart.com"
 */
export function optionalStoreSites(): SupportedSite[] {
  return SHOPPING_SITES.filter(isOptionalStore);
}

/**
 * The registry entry for a source id that came in a message, or null when it names no store.
 *
 * @example storeSiteForSource("etsy.com")?.label // "Etsy"
 */
export function storeSiteForSource(source: string): SupportedSite | null {
  return SHOPPING_SITES.find((site) => site.source === source) ?? null;
}

/**
 * The optional store a URL is on, or null when the URL is on a required store or on no store.
 *
 * @example optionalStoreForUrl("https://www.target.com/p/-/A-1")?.source // "target.com"
 */
export function optionalStoreForUrl(url: string): SupportedSite | null {
  const site = siteForUrl(url);
  return site !== null && isOptionalStore(site) ? site : null;
}

/**
 * Chrome origin patterns for one store, exactly as the manifest declares them.
 *
 * @example storeOrigins(shoppingSite("ebay.com")) // ["https://www.ebay.com/*"]
 */
export function storeOrigins(site: SupportedSite): string[] {
  return siteHostPermissions([site]);
}
