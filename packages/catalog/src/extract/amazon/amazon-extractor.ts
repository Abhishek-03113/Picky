import { firstAttr, firstText, type PageNode } from "../../page/page-node.ts";
import type { ProductSnapshot } from "../../product-snapshot.ts";
import { textOrNull } from "../../text/normalize-text.ts";
import { ProductPageError } from "../product-page-error.ts";
import { amazonBreadcrumbLabels, categoryFromCrumbs } from "../shared/breadcrumb-category.ts";
import { findSpecValue } from "../shared/spec-lookup.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { extractAmazonHighlights } from "./amazon-highlights.ts";
import { extractAmazonImages } from "./amazon-images.ts";
import { extractAmazonListPrice, extractAmazonPrice, extractAmazonRating } from "./amazon-offer.ts";
import { extractAmazonSpecGroups } from "./amazon-specs.ts";
import { AMAZON_COM, AMAZON_IN, type AmazonMarketplace } from "./amazon-marketplace.ts";
import { canonicalAmazonUrl, parseAmazonProductUrl, type AmazonProductRef } from "./amazon-url.ts";

// Byline reads "Visit the Apple Store" or "Brand: Apple".
const BYLINE_BRAND = /^(?:Visit the (.+?) Store|Brand:\s*(.+))$/;

/**
 * Product pages (/dp/<ASIN>) on one Amazon storefront. Amazon ships no JSON-LD, so every field comes
 * from page widgets, which are the same on every storefront.
 *
 * @example createAmazonExtractor(AMAZON_IN).productIdFromUrl("https://www.amazon.in/dp/B0FQG1YHYR") // "B0FQG1YHYR"
 */
export function createAmazonExtractor(marketplace: AmazonMarketplace): SiteExtractor {
  const exampleUrl = canonicalAmazonUrl(marketplace.exampleAsin, marketplace);
  const requireRef = (pageUrl: string): AmazonProductRef => {
    const ref = parseAmazonProductUrl(pageUrl, marketplace);
    if (ref !== null) return ref;
    throw new ProductPageError(`"${pageUrl}" is not an ${marketplace.source} product URL; expected ${exampleUrl}`);
  };
  return {
    source: marketplace.source,
    exampleUrl,
    productIdFromUrl: (pageUrl) => parseAmazonProductUrl(pageUrl, marketplace)?.asin ?? null,
    extract: (page, pageUrl, capturedAt) => extractAmazonProduct(page, requireRef(pageUrl), capturedAt, marketplace),
  };
}

export const amazonInExtractor = createAmazonExtractor(AMAZON_IN);
export const amazonComExtractor = createAmazonExtractor(AMAZON_COM);

/**
 * Reads an Amazon product page into a ProductSnapshot.
 * Throws ProductPageError when the page is not a product page (e.g. a bot challenge).
 *
 * @example extractAmazonProduct(parseHtmlPage(html), { asin: "B0FQG1YHYR" }, new Date(), AMAZON_IN)
 */
export function extractAmazonProduct(
  page: PageNode,
  ref: AmazonProductRef,
  capturedAt: Date,
  marketplace: AmazonMarketplace,
): ProductSnapshot {
  const title = requireAmazonTitle(page, ref);
  // Amazon may serve a sibling variant for the requested ASIN; the page's own ASIN input wins.
  const asin = textOrNull(firstAttr(page, "input#ASIN", "value")) ?? ref.asin;
  const specGroups = extractAmazonSpecGroups(page);
  return {
    source: marketplace.source,
    externalId: asin,
    url: canonicalAmazonUrl(asin, marketplace),
    title,
    brand: findSpecValue(specGroups, "Brand") ?? extractBylineBrand(page),
    category: categoryFromCrumbs(amazonBreadcrumbLabels(page), title),
    price: extractAmazonPrice(page, marketplace.currency),
    listPrice: extractAmazonListPrice(page, marketplace.currency),
    availability: firstText(page, ["#availability"]),
    rating: extractAmazonRating(page),
    images: extractAmazonImages(page),
    highlights: extractAmazonHighlights(page),
    specGroups,
    capturedAt: capturedAt.toISOString(),
  };
}

function requireAmazonTitle(page: PageNode, ref: AmazonProductRef): string {
  const title = firstText(page, ["#productTitle"]);
  if (title !== null) return title;
  throw new ProductPageError(
    `Amazon page for ASIN ${ref.asin} has no #productTitle; expected a product detail page, got a challenge, mobile or error page`,
  );
}

function extractBylineBrand(page: PageNode): string | null {
  const match = BYLINE_BRAND.exec(firstText(page, ["#bylineInfo"]) ?? "");
  return textOrNull(match?.[1] ?? match?.[2]);
}
