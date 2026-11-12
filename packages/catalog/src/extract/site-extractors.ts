import { SHOPPING_SITES, type SiteReader, type SupportedSite } from "../sites/shopping-sites.ts";
import { createAmazonExtractor } from "./amazon/amazon-extractor.ts";
import { createBestBuyExtractor } from "./bestbuy/bestbuy-extractor.ts";
import { createEbayExtractor } from "./ebay/ebay-extractor.ts";
import { createEtsyExtractor } from "./etsy/etsy-extractor.ts";
import { createFlipkartExtractor } from "./flipkart/flipkart-extractor.ts";
import type { SiteExtractor } from "./site-extractor.ts";
import { createTargetExtractor } from "./target/target-extractor.ts";
import { createWalmartExtractor } from "./walmart/walmart-extractor.ts";

// The page reader behind each registry `reader`. A Record, so a site registered with a new reader that has
// no factory here is a type error rather than a silent "unsupported URL" at runtime. Every Amazon
// storefront shares one reader, built per storefront for its host and currency.
const READERS: Record<SiteReader, (site: SupportedSite) => SiteExtractor> = {
  amazon: createAmazonExtractor,
  flipkart: createFlipkartExtractor,
  walmart: createWalmartExtractor,
  target: createTargetExtractor,
  bestbuy: createBestBuyExtractor,
  ebay: createEbayExtractor,
  etsy: createEtsyExtractor,
};

/** A reader for every registered storefront, in registry order. Each owns a disjoint set of hosts. */
export const SITE_EXTRACTORS: readonly SiteExtractor[] = SHOPPING_SITES.map((site) => READERS[site.reader](site));
