import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { createLayeredExtractor, jsonLdSource, metaSource, type LayeredSiteRules } from "../shared/layered-reader.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { readWalmartHighlights, readWalmartSpecGroups, walmartNextDataSource } from "./walmart-next-data.ts";
import { parseWalmartProductUrl } from "./walmart-url.ts";

/**
 * Walmart's reading rules: JSON-LD first, then its `__NEXT_DATA__` page state (which also carries the
 * was price, specs and short-description bullets), then meta tags.
 *
 * @example walmartRules(shoppingSite("walmart.com")).sources.length // 3
 */
export function walmartRules(site: SupportedSite): LayeredSiteRules {
  return {
    parseProductUrl: parseWalmartProductUrl,
    sources: [jsonLdSource, walmartNextDataSource(site.currency), metaSource],
    readSpecGroups: readWalmartSpecGroups,
    readHighlights: readWalmartHighlights,
  };
}

/**
 * Walmart product pages (beta: no captured fixture yet).
 *
 * @example createWalmartExtractor(shoppingSite("walmart.com")).productIdFromUrl("https://www.walmart.com/ip/x/123") // "123"
 */
export function createWalmartExtractor(site: SupportedSite): SiteExtractor {
  return createLayeredExtractor(site, walmartRules(site));
}
