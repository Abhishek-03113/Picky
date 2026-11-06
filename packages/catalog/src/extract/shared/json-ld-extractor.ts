import type { PageNode } from "../../page/page-node.ts";
import type { Highlight, ProductSnapshot, SpecGroup } from "../../product-snapshot.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { ProductPageError } from "../product-page-error.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { categoryFromCrumbs, jsonLdBreadcrumbLabels } from "./breadcrumb-category.ts";
import { readJsonLdProduct, type JsonLdProduct } from "./json-ld-product.ts";
import { findSpecValue } from "./spec-lookup.ts";

/** A product page's identity, read from its URL. */
export interface ProductUrlRef {
  productId: string;
  /** Tracking-free URL, so the same product always stores under one URL. */
  canonicalUrl: string;
}

/**
 * What one store adds on top of schema.org JSON-LD. Most stores embed a JSON-LD Product (name, brand,
 * price, rating, images, availability), so a new store usually needs only its URL rules and, when its
 * spec table is not in the JSON-LD, a reader for it.
 */
export interface JsonLdSiteRules {
  /** The product id and canonical URL when the URL is one of the store's product pages, else null. */
  parseProductUrl(pageUrl: string, site: SupportedSite): ProductUrlRef | null;
  /** Spec tables from the rendered page. Without one, the snapshot has no specs. */
  readSpecGroups?(page: PageNode): SpecGroup[];
  /** "About this item" style bullet points. Without one, the snapshot has none. */
  readHighlights?(page: PageNode): Highlight[];
}

/**
 * A SiteExtractor for a store whose product pages carry schema.org Product JSON-LD.
 *
 * @example createJsonLdExtractor(shoppingSite("flipkart.com"), FLIPKART_RULES).productIdFromUrl(url) // "MOBH1"
 */
export function createJsonLdExtractor(site: SupportedSite, rules: JsonLdSiteRules): SiteExtractor {
  const requireRef = (pageUrl: string): ProductUrlRef => {
    const ref = rules.parseProductUrl(pageUrl, site);
    if (ref !== null) return ref;
    throw new ProductPageError(`"${pageUrl}" is not a ${site.label} product URL; expected ${site.exampleUrl}`);
  };
  return {
    source: site.source,
    exampleUrl: site.exampleUrl,
    productIdFromUrl: (pageUrl) => rules.parseProductUrl(pageUrl, site)?.productId ?? null,
    extract: (page, pageUrl, capturedAt) => extractJsonLdProduct(page, requireRef(pageUrl), capturedAt, site, rules),
  };
}

/**
 * Reads a JSON-LD product page for an already-parsed URL. Identity, price, rating and images come from the
 * JSON-LD (stable across redesigns); specs and highlights from the store's own readers. No list price:
 * JSON-LD offers carry only the selling price.
 *
 * @example extractJsonLdProduct(page, { productId: "MOB1", canonicalUrl }, new Date(), site, FLIPKART_RULES)
 */
export function extractJsonLdProduct(
  page: PageNode,
  ref: ProductUrlRef,
  capturedAt: Date,
  site: SupportedSite,
  rules: JsonLdSiteRules,
): ProductSnapshot {
  const product = requireJsonLdProduct(page, ref, site);
  const specGroups = rules.readSpecGroups?.(page) ?? [];
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
    highlights: rules.readHighlights?.(page) ?? [],
    specGroups,
    sizeCharts: [],
    colorOptions: [],
    capturedAt: capturedAt.toISOString(),
  };
}

function requireJsonLdProduct(
  page: PageNode,
  ref: ProductUrlRef,
  site: SupportedSite,
): JsonLdProduct & { name: string } {
  const product = readJsonLdProduct(page);
  if (product?.name) return { ...product, name: product.name };
  throw new ProductPageError(
    `${site.label} page for ${ref.productId} has no schema.org Product with a name in its JSON-LD; expected a product detail page`,
  );
}
