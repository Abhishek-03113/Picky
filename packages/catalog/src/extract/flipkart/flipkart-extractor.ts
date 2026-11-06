import type { PageNode } from "../../page/page-node.ts";
import type { ProductSnapshot } from "../../product-snapshot.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { createJsonLdExtractor, extractJsonLdProduct, type JsonLdSiteRules } from "../shared/json-ld-extractor.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { extractFlipkartSpecGroups } from "./flipkart-specs.ts";
import { parseFlipkartProductUrl, type FlipkartProductRef } from "./flipkart-url.ts";

/**
 * Flipkart on top of the shared JSON-LD reader: its URL rules and its rendered "Specifications" sections.
 * No list price: the struck-through M.R.P. has no hook that tells it apart from other prices.
 */
export const FLIPKART_RULES: JsonLdSiteRules = {
  parseProductUrl: parseFlipkartProductUrl,
  readSpecGroups: extractFlipkartSpecGroups,
};

/**
 * Flipkart product pages.
 *
 * @example createFlipkartExtractor(shoppingSite("flipkart.com")).extract(parseHtmlPage(html), url, new Date())
 */
export function createFlipkartExtractor(site: SupportedSite): SiteExtractor {
  return createJsonLdExtractor(site, FLIPKART_RULES);
}

/**
 * Reads a Flipkart product page for an already-parsed URL.
 *
 * @example extractFlipkartProduct(page, parseFlipkartProductUrl(url, site)!, new Date(), site)
 */
export function extractFlipkartProduct(
  page: PageNode,
  ref: FlipkartProductRef,
  capturedAt: Date,
  site: SupportedSite,
): ProductSnapshot {
  return extractJsonLdProduct(page, ref, capturedAt, site, FLIPKART_RULES);
}
