import type { ShoppingSite } from "../../sites/shopping-site.ts";
import { siteHosts } from "../../sites/site-urls.ts";
import type { ProductUrlRef } from "../shared/json-ld-extractor.ts";
import { parseUrlOnHosts } from "../shared/parse-site-url.ts";

// Product pages: /ip/<slug>/<item id> or /ip/<item id>; the item id is all digits.
const PRODUCT_PATH = /^\/ip\/(?:[^/]+\/)?(\d+)\/?$/;

/**
 * Recognises a Walmart product-page URL; null for anything else. The canonical URL drops the slug and
 * the tracking query.
 *
 * @example parseWalmartProductUrl("https://www.walmart.com/ip/Onn-TV/5074872077?athbdg=L1600", walmart)
 * // { productId: "5074872077", canonicalUrl: "https://www.walmart.com/ip/5074872077" }
 */
export function parseWalmartProductUrl(pageUrl: string, site: ShoppingSite): ProductUrlRef | null {
  const url = parseUrlOnHosts(pageUrl, new Set(siteHosts(site)));
  const itemId = url === null ? undefined : PRODUCT_PATH.exec(url.pathname)?.[1];
  if (itemId === undefined) return null;
  return { productId: itemId, canonicalUrl: `https://${site.host}/ip/${itemId}` };
}
