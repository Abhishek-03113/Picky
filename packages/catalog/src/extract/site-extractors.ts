import { PRODUCT_SOURCES, shoppingSite, type ProductSource } from "../sites/shopping-sites.ts";
import { createAmazonExtractor } from "./amazon/amazon-extractor.ts";
import { createFlipkartExtractor } from "./flipkart/flipkart-extractor.ts";
import type { SiteExtractor } from "./site-extractor.ts";

// The page reader for every registered store. A Record, so a site added to the registry without a reader
// is a type error here rather than a silent "unsupported URL" at runtime.
const EXTRACTORS_BY_SOURCE: Record<ProductSource, SiteExtractor> = {
  "amazon.in": createAmazonExtractor(shoppingSite("amazon.in")),
  "amazon.com": createAmazonExtractor(shoppingSite("amazon.com")),
  "flipkart.com": createFlipkartExtractor(shoppingSite("flipkart.com")),
};

/** Every marketplace Picky reads, in registry order. Each owns a disjoint set of hosts. */
export const SITE_EXTRACTORS: readonly SiteExtractor[] = PRODUCT_SOURCES.map((source) => EXTRACTORS_BY_SOURCE[source]);
