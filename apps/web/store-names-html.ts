import { supportedStoresText } from "@picky/catalog/sites";

/** Placeholder in index.html for the store list, so the meta description follows the site registry. */
export const STORES_MARKER = "__PICKY_STORES__";

/**
 * Fills the store list into index.html.
 *
 * @example withStoreNames('<meta content="… browse __PICKY_STORES__ …">') // '<meta content="… browse Amazon.in, Amazon.com and Flipkart …">'
 */
export function withStoreNames(html: string): string {
  return html.replaceAll(STORES_MARKER, supportedStoresText());
}
