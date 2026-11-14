import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { createLayeredExtractor, jsonLdSource, metaSource, type LayeredSiteRules } from "../shared/layered-reader.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { readTargetSpecGroups, targetDomSource } from "./target-page.ts";
import { parseTargetProductUrl } from "./target-url.ts";

/**
 * Target's reading rules: JSON-LD first, then the rendered title and price, then meta tags; specs from
 * the item details "Specifications" block.
 *
 * @example targetRules(shoppingSite("target.com")).sources.length // 3
 */
export function targetRules(site: SupportedSite): LayeredSiteRules {
  return {
    parseProductUrl: parseTargetProductUrl,
    sources: [jsonLdSource, targetDomSource(site.currency), metaSource],
    readSpecGroups: readTargetSpecGroups,
  };
}

/**
 * Target product pages (beta: no captured fixture yet).
 *
 * @example createTargetExtractor(shoppingSite("target.com")).productIdFromUrl("https://www.target.com/p/-/A-54191097") // "54191097"
 */
export function createTargetExtractor(site: SupportedSite): SiteExtractor {
  return createLayeredExtractor(site, targetRules(site));
}
