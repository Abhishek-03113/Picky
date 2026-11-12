import { z } from "zod";
import { PRODUCT_SOURCES, type ProductSnapshot } from "./product-snapshot.ts";

// Server-side validation of snapshots sent to the API (`@picky/catalog/schema`). Kept out of the main
// entry so browser bundles, which only build snapshots, do not carry zod.

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

export const SizeChartTableSchema = z.object({
  kind: z.literal("table"),
  title: z.string().min(1).nullable(),
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(z.string())).min(1),
});

export const SizeChartImageSchema = z.object({
  kind: z.literal("image"),
  title: z.string().min(1).nullable(),
  imageUrl: z.url(),
});

export const SizeChartSchema = z.discriminatedUnion("kind", [SizeChartTableSchema, SizeChartImageSchema]);

export const ColorOptionSchema = z.object({
  name: z.string().min(1),
  externalId: z.string().min(1),
  url: z.url(),
  swatchImage: z.url().nullable(),
  selected: z.boolean(),
  price: MoneySchema.nullable(),
  availability: z.string().min(1).nullable(),
  image: z.url().nullable(),
});

/**
 * Validates a submitted snapshot; its output is exactly a ProductSnapshot (checked below).
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
  // Rows stored before 2.0 lack these keys.
  variant: z.string().min(1).nullable().default(null),
  identifiers: z
    .object({
      gtin: z.string().min(1).nullable().default(null),
      mpn: z.string().min(1).nullable().default(null),
      model: z.string().min(1).nullable().default(null),
    })
    .default({ gtin: null, mpn: null, model: null }),
  capturedAt: z.iso.datetime(),
});

// Compile-time guard: the schema's output and the ProductSnapshot interface must not drift apart.
// Strict identity (also catches an extra optional field on one side), not just mutual assignability.
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<Condition extends true> = Condition;
export type SchemaMatchesSnapshotType = Assert<Same<z.infer<typeof ProductSnapshotSchema>, ProductSnapshot>>;

// Backup files are validated with the same zod, so they ship from this entry (`@picky/catalog/schema`).
export * from "./cart/cart-backup-schema.ts";
