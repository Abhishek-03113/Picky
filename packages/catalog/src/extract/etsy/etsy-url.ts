import type { ShoppingSite } from "../../sites/shopping-site.ts";
import { siteHosts } from "../../sites/site-urls.ts";
import { parseUrlOnHosts } from "../shared/parse-site-url.ts";

// /listing/<id> or /listing/<id>/<slug>; a locale prefix such as /uk/ is tolerated.
const LISTING_PATH = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/listing\/(\d+)(?:\/[^/]*)?\/?$/i;

/** Etsy's ProductUrlRef: the id is the listing id. */
export interface EtsyProductRef {
  productId: string;
  canonicalUrl: string;
}

/**
 * Recognises an Etsy listing URL; null for anything else.
 *
 * @example parseEtsyProductUrl("https://www.etsy.com/listing/1234567/handmade-mug?ref=x", etsy)
 * // { productId: "1234567", canonicalUrl: "https://www.etsy.com/listing/1234567" }
 */
export function parseEtsyProductUrl(pageUrl: string, site: ShoppingSite): EtsyProductRef | null {
  const url = parseUrlOnHosts(pageUrl, new Set(siteHosts(site)));
  const id = url === null ? undefined : LISTING_PATH.exec(url.pathname)?.[1];
  return id === undefined ? null : { productId: id, canonicalUrl: `https://${site.host}/listing/${id}` };
}
