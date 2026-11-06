import { z } from "zod";

/** Marketplaces Picky can read; each has a SiteExtractor in src/extract/site-extractors.ts. */
export const PRODUCT_SOURCES = ["amazon.in", "flipkart.com"] as const;

export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
});

export const SpecSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const SpecGroupSchema = z.object({
  title: z.string().min(1),
  specs: z.array(SpecSchema).min(1),
});

export const HighlightSchema = z.object({
  heading: z.string().min(1).nullable(),
  text: z.string().min(1),
});

export const RatingSchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
});

/** A size chart the page shows as a table: header row plus one row per size, cells as printed. */
export const SizeChartTableSchema = z.object({
  kind: z.literal("table"),
  /** The chart's own heading, e.g. "IN Regular"; null when the page gives none. */
  title: z.string().min(1).nullable(),
  /** Header cells, e.g. ["Brand Size", "Chest (in)"]. A unit in brackets marks a measurement column. */
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(z.string())).min(1),
});

/** A size chart the seller uploaded as a picture; it cannot be converted, only shown. */
export const SizeChartImageSchema = z.object({
  kind: z.literal("image"),
  title: z.string().min(1).nullable(),
  imageUrl: z.url(),
});

export const SizeChartSchema = z.discriminatedUnion("kind", [SizeChartTableSchema, SizeChartImageSchema]);

/**
 * One colour the product is sold in. Each colour is its own listing with its own product id, so
 * price, availability and image come from reading that colour's page; they stay null until it is read.
 */
export const ColorOptionSchema = z.object({
  name: z.string().min(1),
  externalId: z.string().min(1),
  url: z.url(),
  swatchImage: z.url().nullable(),
  /** True for the colour of the page this snapshot was read from. */
  selected: z.boolean(),
  price: MoneySchema.nullable(),
  availability: z.string().min(1).nullable(),
  image: z.url().nullable(),
});

/**
 * Everything Picky keeps about one product page at one moment.
 * Produced by the extension from the live DOM or from a fetched page; both use the same extractor.
 *
 * @example ProductSnapshotSchema.parse(await request.json())
 */
export const ProductSnapshotSchema = z.object({
  source: z.enum(PRODUCT_SOURCES),
  externalId: z.string().min(1),
  url: z.url(),
  title: z.string().min(1),
  brand: z.string().min(1).nullable(),
  // Rows stored before categories existed lack the key; default keeps them readable.
  category: z.string().min(1).nullable().default(null),
  price: MoneySchema.nullable(),
  listPrice: MoneySchema.nullable(),
  availability: z.string().min(1).nullable(),
  rating: RatingSchema.nullable(),
  images: z.array(z.url()),
  highlights: z.array(HighlightSchema),
  specGroups: z.array(SpecGroupSchema),
  // Rows stored before size charts and colours existed lack these keys; defaults keep them readable.
  sizeCharts: z.array(SizeChartSchema).default([]),
  colorOptions: z.array(ColorOptionSchema).default([]),
  capturedAt: z.iso.datetime(),
});

export type ProductSource = (typeof PRODUCT_SOURCES)[number];
export type Money = z.infer<typeof MoneySchema>;
export type Spec = z.infer<typeof SpecSchema>;
export type SpecGroup = z.infer<typeof SpecGroupSchema>;
export type Highlight = z.infer<typeof HighlightSchema>;
export type Rating = z.infer<typeof RatingSchema>;
export type SizeChartTable = z.infer<typeof SizeChartTableSchema>;
export type SizeChartImage = z.infer<typeof SizeChartImageSchema>;
export type SizeChart = z.infer<typeof SizeChartSchema>;
export type ColorOption = z.infer<typeof ColorOptionSchema>;
export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>;

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
