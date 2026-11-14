import type { ShoppingSite } from "../../sites/shopping-site.ts";
import { siteHosts } from "../../sites/site-urls.ts";
import type { ProductUrlRef } from "../shared/json-ld-extractor.ts";
import { parseUrlOnHosts } from "../shared/parse-site-url.ts";

// Product pages: /p/<slug>/-/A-<tcin> or /p/-/A-<tcin>; the TCIN (Target's item id) is all digits.
const PRODUCT_PATH = /^\/p\/(?:[^/]+\/)?-\/A-(\d+)\/?$/i;

/**
 * Recognises a Target product-page URL; null for anything else. The canonical URL drops the slug and
 * the tracking query (preselect, lnk, …).
 *
 * @example parseTargetProductUrl("https://www.target.com/p/apple-airpods/-/A-54191097?preselect=1#lnk=sametab", target)
 * // { productId: "54191097", canonicalUrl: "https://www.target.com/p/-/A-54191097" }
 */
export function parseTargetProductUrl(pageUrl: string, site: ShoppingSite): ProductUrlRef | null {
  const url = parseUrlOnHosts(pageUrl, new Set(siteHosts(site)));
  const tcin = url === null ? undefined : PRODUCT_PATH.exec(url.pathname)?.[1];
  if (tcin === undefined) return null;
  return { productId: tcin, canonicalUrl: `https://${site.host}/p/-/A-${tcin}` };
}
