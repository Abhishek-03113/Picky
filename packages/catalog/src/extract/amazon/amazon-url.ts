import type { ShoppingSite } from "../../sites/shopping-site.ts";
import { siteHosts } from "../../sites/site-urls.ts";
import { parseUrlOnHosts } from "../shared/parse-site-url.ts";

// Product pages live at /dp/<ASIN> or /gp/product/<ASIN>, optionally behind a slug: /Apple-iPhone-17/dp/B0FQG1YHYR/ref=…
const ASIN_IN_PATH = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/;

export interface AmazonProductRef {
  asin: string;
}

/**
 * Recognises a product-page URL on this Amazon storefront and pulls out its ASIN; null for anything else.
 *
 * @example parseAmazonProductUrl("https://www.amazon.in/dp/B0FQG1YHYR", shoppingSite("amazon.in")) // { asin: "B0FQG1YHYR" }
 */
export function parseAmazonProductUrl(pageUrl: string, site: ShoppingSite): AmazonProductRef | null {
  const url = parseUrlOnHosts(pageUrl, new Set(siteHosts(site)));
  const asin = url === null ? undefined : ASIN_IN_PATH.exec(url.pathname)?.[1];
  return asin === undefined ? null : { asin };
}

/**
 * Tracking-free product URL, so the same product always stores under one URL.
 *
 * @example canonicalAmazonUrl("B0FQG1YHYR", shoppingSite("amazon.in")) // "https://www.amazon.in/dp/B0FQG1YHYR"
 */
export function canonicalAmazonUrl(asin: string, site: ShoppingSite): string {
  return `https://${site.host}/dp/${asin}`;
}
