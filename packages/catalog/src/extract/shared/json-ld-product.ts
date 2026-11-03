import type { PageNode } from "../../page/page-node.ts";
import type { Money, Rating } from "../../product-snapshot.ts";
import { schemaOrgAvailabilityLabel } from "./schema-org-availability.ts";

// A hand-written reader instead of a zod schema: this runs in the browser (extension, offscreen parser),
// where zod would be most of the bundle. Same rules as before: lenient where sites are loose (numbers as
// strings, brand as text or object, one item or a list), but a field present with the wrong shape
// rejects the node.

interface RawJsonLdOffer {
  price?: number;
  priceCurrency?: string;
  availability?: string;
}

interface RawJsonLdProduct {
  type: string[];
  name?: string;
  sku?: string;
  image?: string[];
  brand?: string;
  aggregateRating?: { ratingValue: number; ratingCount?: number };
  offers?: RawJsonLdOffer[];
}

/** The schema.org Product fields Picky uses, normalised. */
export interface JsonLdProduct {
  name: string | null;
  sku: string | null;
  brand: string | null;
  images: string[];
  price: Money | null;
  availability: string | null;
  rating: Rating | null;
}

/**
 * Finds the schema.org Product in the page's JSON-LD blocks (top-level, array or @graph).
 *
 * @example readJsonLdProduct(page)?.price // { amount: 84999, currency: "INR" }
 */
export function readJsonLdProduct(page: PageNode): JsonLdProduct | null {
  const product = page
    .findAll('script[type="application/ld+json"]')
    .flatMap((script) => parseJsonLdNodes(script.text()))
    .map(readRawProduct)
    .find((raw) => raw !== null && raw.type.includes("Product"));
  return product ? normalizeJsonLdProduct(product) : null;
}

/**
 * Parses one JSON-LD block into its nodes; malformed JSON yields none.
 *
 * @example parseJsonLdNodes('{"@graph":[{"@type":"Product"}]}') // [{ "@type": "Product" }]
 */
export function parseJsonLdNodes(json: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return [parsed].flat().flatMap(expandGraph);
  } catch {
    return [];
  }
}

function expandGraph(node: unknown): unknown[] {
  const graph = typeof node === "object" && node !== null && "@graph" in node ? node["@graph"] : undefined;
  return Array.isArray(graph) ? graph : [node];
}

function normalizeJsonLdProduct(raw: RawJsonLdProduct): JsonLdProduct {
  const offer = raw.offers?.[0];
  return {
    name: raw.name ?? null,
    sku: raw.sku ?? null,
    brand: raw.brand ?? null,
    images: raw.image ?? [],
    price: offerPrice(offer),
    availability: offer?.availability ? schemaOrgAvailabilityLabel(offer.availability) : null,
    rating: raw.aggregateRating
      ? { average: raw.aggregateRating.ratingValue, count: raw.aggregateRating.ratingCount ?? 0 }
      : null,
  };
}

function offerPrice(offer: RawJsonLdOffer | undefined): Money | null {
  if (offer?.price === undefined || offer.priceCurrency === undefined) return null;
  return { amount: offer.price, currency: offer.priceCurrency };
}

/** Thrown by the field readers below when a present field has the wrong shape; rejects the whole node. */
class InvalidNode extends Error {}

/**
 * Reads one JSON-LD node as a schema.org thing with Product fields, or null when it does not fit.
 *
 * @example readRawProduct({ "@type": "Product", offers: { price: "84999", priceCurrency: "INR" } })?.offers
 * // [{ price: 84999, priceCurrency: "INR" }]
 */
function readRawProduct(node: unknown): RawJsonLdProduct | null {
  try {
    const fields = record(node);
    return {
      type: oneOrMany(fields["@type"], text),
      name: optional(fields.name, text),
      sku: optional(fields.sku, text),
      image: optional(fields.image, (value) => oneOrMany(value, text)),
      brand: optional(fields.brand, brandName),
      aggregateRating: optional(fields.aggregateRating, aggregateRating),
      offers: optional(fields.offers, (value) => oneOrMany(value, offer)),
    };
  } catch (error) {
    if (error instanceof InvalidNode) return null;
    throw error;
  }
}

function offer(value: unknown): RawJsonLdOffer {
  const fields = record(value);
  return {
    price: optional(fields.price, number),
    priceCurrency: optional(fields.priceCurrency, currencyCode),
    availability: optional(fields.availability, text),
  };
}

function aggregateRating(value: unknown): { ratingValue: number; ratingCount?: number } {
  const fields = record(value);
  return { ratingValue: number(fields.ratingValue), ratingCount: optional(fields.ratingCount, number) };
}

function brandName(value: unknown): string {
  return typeof value === "string" ? value : text(record(value).name);
}

function oneOrMany<T>(value: unknown, read: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(read) : [read(value)];
}

function optional<T>(value: unknown, read: (present: unknown) => T): T | undefined {
  return value === undefined ? undefined : read(value);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvalidNode();
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string") throw new InvalidNode();
  return value;
}

function currencyCode(value: unknown): string {
  const code = text(value);
  if (code.length !== 3) throw new InvalidNode();
  return code;
}

// Like JSON-LD in the wild (and zod's coerce): "84999" and 84999 both count; NaN and Infinity do not.
function number(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new InvalidNode();
  return parsed;
}
