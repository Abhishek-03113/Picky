import type { ShoppingSite } from "../../sites/shopping-site.ts";
import { siteHosts } from "../../sites/site-urls.ts";
import { parseUrlOnHosts } from "../shared/parse-site-url.ts";

// Product pages: /<slug>/p/<item id>?pid=<FSN>&lid=…&srno=… (search tracking we drop).
const PRODUCT_PATH = /^\/[^/]+\/p\/(itm[a-z0-9]+)\/?$/i;

/** Flipkart's ProductUrlRef: the id is the FSN. */
export interface FlipkartProductRef {
  /** FSN, Flipkart's product id (e.g. MOBHQV9YAZYYWY8A); falls back to the item id when pid is absent. */
  productId: string;
  canonicalUrl: string;
}

/**
 * Recognises a Flipkart product-page URL; null for anything else.
 *
 * @example parseFlipkartProductUrl("https://www.flipkart.com/apple-iphone-17/p/itm68ad?pid=MOBH1&srno=s_1", flipkart)
 * // { productId: "MOBH1", canonicalUrl: "https://www.flipkart.com/apple-iphone-17/p/itm68ad?pid=MOBH1" }
 */
export function parseFlipkartProductUrl(pageUrl: string, site: ShoppingSite): FlipkartProductRef | null {
  const url = parseUrlOnHosts(pageUrl, new Set(siteHosts(site)));
  const itemId = url === null ? undefined : PRODUCT_PATH.exec(url.pathname)?.[1];
  if (url === null || itemId === undefined) return null;
  const pid = url.searchParams.get("pid");
  const query = pid === null ? "" : `?pid=${pid}`;
  return { productId: pid ?? itemId, canonicalUrl: `https://${site.host}${url.pathname}${query}` };
}
