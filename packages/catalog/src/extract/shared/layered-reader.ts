import type { PageNode } from "../../page/page-node.ts";
import type { Highlight, Money, ProductSnapshot, Rating, SpecGroup } from "../../product-snapshot.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { ProductPageError } from "../product-page-error.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { categoryFromCrumbs, jsonLdBreadcrumbLabels } from "./breadcrumb-category.ts";
import type { ProductUrlRef } from "./json-ld-extractor.ts";
import { readJsonLdProduct } from "./json-ld-product.ts";
import { readMetaProduct } from "./meta-product.ts";
import { readMicrodataProduct } from "./microdata-product.ts";
import { findSpecValue } from "./spec-lookup.ts";

/** The product fields a layered source can supply. */
export interface LayeredFields {
  title: string;
  brand: string;
  price: Money;
  listPrice: Money;
  availability: string;
  rating: Rating;
  images: string[];
  sku: string;
  gtin: string;
  mpn: string;
  model: string;
}

export type LayeredField = keyof LayeredFields;

/**
 * One place a page states product fields (JSON-LD, meta tags, a store's own widgets). Returns the fields
 * it found; null, missing, blank and empty-list values all mean "not here". `sourceName` labels it in
 * provenance; without one the function's own name is used.
 */
export type LayeredSource = ((page: PageNode) => Partial<LayeredFields> | null) & { readonly sourceName?: string };

/** The fields read from a page, and which source supplied each. */
export interface LayeredRead {
  fields: Partial<LayeredFields>;
  provenance: Partial<Record<LayeredField, string>>;
}

/** What one store needs to be read by layering sources: its URL rules, sources and own widgets. */
export interface LayeredSiteRules {
  /** The product id and canonical URL when the URL is one of the store's product pages, else null. */
  parseProductUrl(pageUrl: string, site: SupportedSite): ProductUrlRef | null;
  /** Most trusted first; each field comes from the first source that has it. */
  sources: readonly LayeredSource[];
  /** Spec tables from the rendered page. Without one, the snapshot has no specs. */
  readSpecGroups?(page: PageNode): SpecGroup[];
  /** "About this item" style bullet points. Without one, the snapshot has none. */
  readHighlights?(page: PageNode): Highlight[];
  /** The selected variant, e.g. "Black, 256 GB". Without one, the snapshot has none. */
  readVariant?(page: PageNode): string | null;
}

const LAYERED_FIELDS: readonly LayeredField[] = [
  "title",
  "brand",
  "price",
  "listPrice",
  "availability",
  "rating",
  "images",
  "sku",
  "gtin",
  "mpn",
  "model",
];

/**
 * Gives a source a stable name for provenance (function names do not survive minification).
 *
 * @example namedSource("store-widgets", (page) => ({ title: firstText(page, ["h1"]) ?? undefined }))
 */
export function namedSource(name: string, read: (page: PageNode) => Partial<LayeredFields> | null): LayeredSource {
  return Object.assign((page: PageNode) => read(page), { sourceName: name });
}

/** The page's schema.org Product JSON-LD. No list price: JSON-LD offers carry only the selling price. */
export const jsonLdSource: LayeredSource = namedSource("json-ld", (page) => {
  const product = readJsonLdProduct(page);
  if (product === null) return null;
  return {
    title: product.name ?? undefined,
    brand: product.brand ?? undefined,
    price: product.price ?? undefined,
    availability: product.availability ?? undefined,
    rating: product.rating ?? undefined,
    images: product.images,
    sku: product.sku ?? undefined,
    gtin: product.gtin ?? undefined,
    mpn: product.mpn ?? undefined,
    model: product.model ?? undefined,
  };
});

/** Open Graph / product meta tags: title, one image and the price. */
export const metaSource: LayeredSource = namedSource("meta", (page) => {
  const meta = readMetaProduct(page);
  return {
    title: meta.name ?? undefined,
    price: meta.price ?? undefined,
    images: meta.image === null ? [] : [meta.image],
  };
});

/** schema.org microdata: title, brand, sku, one image and the price. */
export const microdataSource: LayeredSource = namedSource("microdata", (page) => {
  const microdata = readMicrodataProduct(page);
  return {
    title: microdata.name ?? undefined,
    brand: microdata.brand ?? undefined,
    sku: microdata.sku ?? undefined,
    price: microdata.price ?? undefined,
    images: microdata.image === null ? [] : [microdata.image],
  };
});

/**
 * Reads every source once and takes each field from the first source with a non-empty value, noting
 * which source that was.
 *
 * @example readLayeredFields(page, [jsonLdSource, metaSource]).provenance // { title: "json-ld", images: "meta" }
 */
export function readLayeredFields(page: PageNode, sources: readonly LayeredSource[]): LayeredRead {
  const reads = sources.map((source, index) => ({ name: sourceLabel(source, index), fields: source(page) ?? {} }));
  const fields: Record<string, unknown> = {};
  const provenance: Partial<Record<LayeredField, string>> = {};
  for (const field of LAYERED_FIELDS) {
    const supplier = reads.find((read) => hasValue(read.fields[field]));
    if (supplier === undefined) continue;
    fields[field] = supplier.fields[field];
    provenance[field] = supplier.name;
  }
  return { fields: fields as Partial<LayeredFields>, provenance };
}

/**
 * A SiteExtractor that layers the store's sources (e.g. JSON-LD, then meta tags, then microdata) and
 * adds its own spec, highlight and variant readers.
 *
 * @example createLayeredExtractor(site, { parseProductUrl, sources: [jsonLdSource, metaSource] }).extract(page, url, new Date())
 */
export function createLayeredExtractor(site: SupportedSite, rules: LayeredSiteRules): SiteExtractor {
  const requireRef = (pageUrl: string): ProductUrlRef => {
    const ref = rules.parseProductUrl(pageUrl, site);
    if (ref !== null) return ref;
    throw new ProductPageError(`"${pageUrl}" is not a ${site.label} product URL; expected ${site.exampleUrl}`);
  };
  return {
    source: site.source,
    exampleUrl: site.exampleUrl,
    productIdFromUrl: (pageUrl) => rules.parseProductUrl(pageUrl, site)?.productId ?? null,
    extract: (page, pageUrl, capturedAt) => extractLayeredProduct(page, requireRef(pageUrl), capturedAt, site, rules),
  };
}

/**
 * Reads a product page for an already-parsed URL by layering the store's sources.
 * Throws ProductPageError when no source gives a title.
 *
 * @example extractLayeredProduct(page, { productId: "P1", canonicalUrl }, new Date(), site, rules).title
 */
export function extractLayeredProduct(
  page: PageNode,
  ref: ProductUrlRef,
  capturedAt: Date,
  site: SupportedSite,
  rules: LayeredSiteRules,
): ProductSnapshot {
  const { fields } = readLayeredFields(page, rules.sources);
  const title = fields.title;
  if (title === undefined) {
    throw new ProductPageError(
      `${site.label} page for ${ref.productId} has no product title in any source; expected a product detail page`,
    );
  }
  const specGroups = rules.readSpecGroups?.(page) ?? [];
  return {
    source: site.source,
    externalId: fields.sku ?? ref.productId,
    url: ref.canonicalUrl,
    title,
    brand: findSpecValue(specGroups, "Brand") ?? fields.brand ?? null,
    category: categoryFromCrumbs(jsonLdBreadcrumbLabels(page), title),
    price: fields.price ?? null,
    listPrice: fields.listPrice ?? null,
    availability: fields.availability ?? null,
    rating: fields.rating ?? null,
    images: fields.images ?? [],
    highlights: rules.readHighlights?.(page) ?? [],
    specGroups,
    sizeCharts: [],
    colorOptions: [],
    variant: rules.readVariant?.(page) ?? null,
    identifiers: { gtin: fields.gtin ?? null, mpn: fields.mpn ?? null, model: fields.model ?? null },
    capturedAt: capturedAt.toISOString(),
  };
}

function sourceLabel(source: LayeredSource, index: number): string {
  return source.sourceName ?? (source.name || `source ${index + 1}`);
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
