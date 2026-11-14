import { firstAttr, firstText, type PageNode } from "../../page/page-node.ts";
import { NO_IDENTIFIERS, type ProductSnapshot } from "../../product-snapshot.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { textOrNull } from "../../text/normalize-text.ts";
import { ProductPageError } from "../product-page-error.ts";
import { amazonBreadcrumbLabels, categoryFromCrumbs } from "../shared/breadcrumb-category.ts";
import { findSpecValue } from "../shared/spec-lookup.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { extractAmazonColorOptions } from "./amazon-color-options.ts";
import { extractAmazonHighlights } from "./amazon-highlights.ts";
import { extractAmazonImages } from "./amazon-images.ts";
import { extractAmazonListPrice, extractAmazonPrice, extractAmazonRating } from "./amazon-offer.ts";
import { extractAmazonSizeCharts } from "./amazon-size-charts.ts";
import { extractAmazonSpecGroups } from "./amazon-specs.ts";
import { canonicalAmazonUrl, parseAmazonProductUrl, type AmazonProductRef } from "./amazon-url.ts";
import { extractAmazonVariant } from "./amazon-variant.ts";

// Byline reads "Visit the Apple Store" or "Brand: Apple".
const BYLINE_BRAND = /^(?:Visit the (.+?) Store|Brand:\s*(.+))$/;

/**
 * Product pages (/dp/<ASIN>) on one Amazon storefront. Amazon ships no JSON-LD, so every field comes
 * from page widgets, which are the same on every storefront: a new storefront is a registry entry plus
 * one line in site-extractors.ts.
 *
 * @example createAmazonExtractor(shoppingSite("amazon.in")).productIdFromUrl("https://www.amazon.in/dp/B0FQG1YHYR") // "B0FQG1YHYR"
 */
export function createAmazonExtractor(site: SupportedSite): SiteExtractor {
  const requireRef = (pageUrl: string): AmazonProductRef => {
    const ref = parseAmazonProductUrl(pageUrl, site);
    if (ref !== null) return ref;
    throw new ProductPageError(`"${pageUrl}" is not an ${site.label} product URL; expected ${site.exampleUrl}`);
  };
  return {
    source: site.source,
    exampleUrl: site.exampleUrl,
    productIdFromUrl: (pageUrl) => parseAmazonProductUrl(pageUrl, site)?.asin ?? null,
    extract: (page, pageUrl, capturedAt) => extractAmazonProduct(page, requireRef(pageUrl), capturedAt, site),
  };
}

/**
 * Reads an Amazon product page into a ProductSnapshot.
 * Throws ProductPageError when the page is not a product page (e.g. a bot challenge).
 *
 * @example extractAmazonProduct(parseHtmlPage(html), { asin: "B0FQG1YHYR" }, new Date(), shoppingSite("amazon.in"))
 */
export function extractAmazonProduct(
  page: PageNode,
  ref: AmazonProductRef,
  capturedAt: Date,
  site: SupportedSite,
): ProductSnapshot {
  const title = requireAmazonTitle(page, ref);
  // Amazon may serve a sibling variant for the requested ASIN; the page's own ASIN input wins.
  const asin = textOrNull(firstAttr(page, "input#ASIN", "value")) ?? ref.asin;
  const specGroups = extractAmazonSpecGroups(page);
  const price = extractAmazonPrice(page, site.currency);
  const availability = firstText(page, ["#availability"]);
  const images = extractAmazonImages(page);
  return {
    source: site.source,
    externalId: asin,
    url: canonicalAmazonUrl(asin, site),
    title,
    brand: findSpecValue(specGroups, "Brand") ?? extractBylineBrand(page),
    category: categoryFromCrumbs(amazonBreadcrumbLabels(page), title),
    price,
    listPrice: extractAmazonListPrice(page, site.currency),
    availability,
    rating: extractAmazonRating(page),
    images,
    highlights: extractAmazonHighlights(page),
    specGroups,
    sizeCharts: extractAmazonSizeCharts(page),
    colorOptions: extractAmazonColorOptions(page, site, { price, availability, image: images[0] ?? null }),
    variant: extractAmazonVariant(page),
    identifiers: NO_IDENTIFIERS,
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
