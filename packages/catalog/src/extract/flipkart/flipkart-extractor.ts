import type { PageNode } from "../../page/page-node.ts";
import type { ProductSnapshot } from "../../product-snapshot.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { ProductPageError } from "../product-page-error.ts";
import { categoryFromCrumbs, jsonLdBreadcrumbLabels } from "../shared/breadcrumb-category.ts";
import { readJsonLdProduct, type JsonLdProduct } from "../shared/json-ld-product.ts";
import { findSpecValue } from "../shared/spec-lookup.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { extractFlipkartSpecGroups } from "./flipkart-specs.ts";
import { parseFlipkartProductUrl, type FlipkartProductRef } from "./flipkart-url.ts";

/**
 * Flipkart product pages. Identity, price, rating and images come from the schema.org JSON-LD
 * (stable across redesigns); specs come from the rendered "Specifications" sections.
 * No list price: the struck-through M.R.P. has no hook that tells it apart from other prices.
 *
 * @example createFlipkartExtractor(shoppingSite("flipkart.com")).extract(parseHtmlPage(html), url, new Date())
 */
export function createFlipkartExtractor(site: SupportedSite): SiteExtractor {
  const requireRef = (pageUrl: string): FlipkartProductRef => {
    const ref = parseFlipkartProductUrl(pageUrl, site);
    if (ref !== null) return ref;
    throw new ProductPageError(`"${pageUrl}" is not a ${site.label} product URL; expected ${site.exampleUrl}`);
  };
  return {
    source: site.source,
    exampleUrl: site.exampleUrl,
    productIdFromUrl: (pageUrl) => parseFlipkartProductUrl(pageUrl, site)?.productId ?? null,
    extract: (page, pageUrl, capturedAt) => extractFlipkartProduct(page, requireRef(pageUrl), capturedAt, site),
  };
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
  const product = requireJsonLdProduct(page, ref);
  const specGroups = extractFlipkartSpecGroups(page);
  return {
    source: site.source,
    externalId: product.sku ?? ref.productId,
    url: ref.canonicalUrl,
    title: product.name,
    brand: findSpecValue(specGroups, "Brand") ?? product.brand,
    category: categoryFromCrumbs(jsonLdBreadcrumbLabels(page), product.name),
    price: product.price,
    listPrice: null,
    availability: product.availability,
    rating: product.rating,
    images: product.images,
    highlights: [],
    specGroups,
    capturedAt: capturedAt.toISOString(),
  };
}

function requireJsonLdProduct(page: PageNode, ref: FlipkartProductRef): JsonLdProduct & { name: string } {
  const product = readJsonLdProduct(page);
  if (product?.name) return { ...product, name: product.name };
  throw new ProductPageError(
    `Flipkart page for ${ref.productId} has no schema.org Product with a name in its JSON-LD; expected a product detail page`,
  );
}
