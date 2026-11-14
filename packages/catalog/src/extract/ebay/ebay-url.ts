import type { ShoppingSite } from "../../sites/shopping-site.ts";
import { siteHosts } from "../../sites/site-urls.ts";
import { parseUrlOnHosts } from "../shared/parse-site-url.ts";

// /itm/<id> or /itm/<slug>/<id>; tracking query strings are dropped.
const ITEM_PATH = /^\/itm\/(?:[^/]+\/)?(\d+)\/?$/;

/** eBay's ProductUrlRef: the id is the item number. */
export interface EbayProductRef {
  productId: string;
  canonicalUrl: string;
}

/**
 * Recognises an eBay listing URL; null for anything else.
 *
 * @example parseEbayProductUrl("https://www.ebay.com/itm/some-title/123456789012?hash=x", ebay)
 * // { productId: "123456789012", canonicalUrl: "https://www.ebay.com/itm/123456789012" }
 */
export function parseEbayProductUrl(pageUrl: string, site: ShoppingSite): EbayProductRef | null {
  const url = parseUrlOnHosts(pageUrl, new Set(siteHosts(site)));
  const id = url === null ? undefined : ITEM_PATH.exec(url.pathname)?.[1];
  return id === undefined ? null : { productId: id, canonicalUrl: `https://${site.host}/itm/${id}` };
}
