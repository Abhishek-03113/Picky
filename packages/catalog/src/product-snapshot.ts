/**
 * The product snapshot model, as plain types. Browser code (web app, extension) imports these; the
 * zod schemas that validate untrusted input live in product-snapshot-schema.ts (`@picky/catalog/schema`),
 * so validation code is not shipped to every page.
 */

import type { ProductSource } from "./sites/shopping-sites.ts";

/** Stores Picky can read come from the registry in src/sites/shopping-sites.ts. */
export { PRODUCT_SOURCES, type ProductSource } from "./sites/shopping-sites.ts";

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

/** A size chart the page shows as a table: header row plus one row per size, cells as printed. */
export interface SizeChartTable {
  kind: "table";
  /** The chart's own heading, e.g. "IN Regular"; null when the page gives none. */
  title: string | null;
  /** Header cells, e.g. ["Brand Size", "Chest (in)"]. A unit in brackets marks a measurement column. */
  columns: string[];
  rows: string[][];
}

/** A size chart the seller uploaded as a picture; it cannot be converted, only shown. */
export interface SizeChartImage {
  kind: "image";
  title: string | null;
  imageUrl: string;
}

export type SizeChart = SizeChartTable | SizeChartImage;

/**
 * One colour the product is sold in. Each colour is its own listing with its own product id, so
 * price, availability and image come from reading that colour's page; they stay null until it is read.
 */
export interface ColorOption {
  name: string;
  externalId: string;
  url: string;
  swatchImage: string | null;
  /** True for the colour of the page this snapshot was read from. */
  selected: boolean;
  price: Money | null;
  availability: string | null;
  image: string | null;
}

/** Ids that name the same product in every store; each is null when the page does not list it. */
export interface ProductIdentifiers {
  gtin: string | null;
  mpn: string | null;
  model: string | null;
}

export const NO_IDENTIFIERS: ProductIdentifiers = { gtin: null, mpn: null, model: null };

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
  sizeCharts: SizeChart[];
  colorOptions: ColorOption[];
  /** The options selected on the page, e.g. "Blue, 256 GB"; null when the page shows none. */
  variant: string | null;
  identifiers: ProductIdentifiers;
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
