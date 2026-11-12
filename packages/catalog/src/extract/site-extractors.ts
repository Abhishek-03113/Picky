import { SHOPPING_SITES, type SiteReader, type SupportedSite } from "../sites/shopping-sites.ts";
import { createAmazonExtractor } from "./amazon/amazon-extractor.ts";
import { createFlipkartExtractor } from "./flipkart/flipkart-extractor.ts";
import { createLayeredExtractor, jsonLdSource } from "./shared/layered-reader.ts";
import type { SiteExtractor } from "./site-extractor.ts";

// The page reader behind each registry `reader`. A Record, so a site registered with a new reader that has
// no factory here is a type error rather than a silent "unsupported URL" at runtime. Every Amazon
// storefront shares one reader, built per storefront for its host and currency.
const READERS: Record<SiteReader, (site: SupportedSite) => SiteExtractor> = {
  amazon: createAmazonExtractor,
  flipkart: createFlipkartExtractor,
  // replaced by extract/walmart
  walmart: (site) => createLayeredExtractor(site, { parseProductUrl: () => null, sources: [jsonLdSource] }),
  // replaced by extract/target
  target: (site) => createLayeredExtractor(site, { parseProductUrl: () => null, sources: [jsonLdSource] }),
  // replaced by extract/bestbuy
  bestbuy: (site) => createLayeredExtractor(site, { parseProductUrl: () => null, sources: [jsonLdSource] }),
  // replaced by extract/ebay
  ebay: (site) => createLayeredExtractor(site, { parseProductUrl: () => null, sources: [jsonLdSource] }),
  // replaced by extract/etsy
  etsy: (site) => createLayeredExtractor(site, { parseProductUrl: () => null, sources: [jsonLdSource] }),
};

/** A reader for every registered storefront, in registry order. Each owns a disjoint set of hosts. */
export const SITE_EXTRACTORS: readonly SiteExtractor[] = SHOPPING_SITES.map((site) => READERS[site.reader](site));
