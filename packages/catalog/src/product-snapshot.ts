/**
 * The product snapshot model, as plain types. Browser code (web app, extension) imports these; the
 * zod schemas that validate untrusted input live in product-snapshot-schema.ts (`@picky/catalog/schema`),
 * so validation code is not shipped to every page.
 */

/** Marketplaces Picky can read; each has a SiteExtractor in src/extract/site-extractors.ts. */
export const PRODUCT_SOURCES = ["amazon.in", "flipkart.com"] as const;

export type ProductSource = (typeof PRODUCT_SOURCES)[number];

export interface Money {
  amount: number;
  /** ISO 4217 code, e.g. "INR". */
  currency: string;
}

export interface Spec {
  label: string;
  value: string;
}

export interface SpecGroup {
  title: string;
  specs: Spec[];
}

export interface Highlight {
  heading: string | null;
  text: string;
}

export interface Rating {
  /** 0 to 5. */
  average: number;
  count: number;
}

/**
 * Everything Picky keeps about one product page at one moment.
 * Produced by the extension (live DOM) or the API (fetched HTML); both use the same extractor.
 */
export interface ProductSnapshot {
  source: ProductSource;
  externalId: string;
  url: string;
  title: string;
  brand: string | null;
  category: string | null;
  price: Money | null;
  listPrice: Money | null;
  availability: string | null;
  rating: Rating | null;
  images: string[];
  highlights: Highlight[];
  specGroups: SpecGroup[];
  /** ISO 8601 date-time. */
  capturedAt: string;
}

/** A stored snapshot, as the API returns it. */
export interface CatalogProduct {
  id: string;
  snapshot: ProductSnapshot;
  createdAt: string;
  updatedAt: string;
}

/** The slim row the product list shows. */
export interface CatalogProductSummary {
  id: string;
  source: ProductSource;
  title: string;
  brand: string | null;
  category: string | null;
  price: Money | null;
  imageUrl: string | null;
  updatedAt: string;
}
