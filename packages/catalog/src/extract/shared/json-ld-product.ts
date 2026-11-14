import { parseAmount } from "../../money/parse-money.ts";
import type { PageNode } from "../../page/page-node.ts";
import type { Money, Rating } from "../../product-snapshot.ts";
import { schemaOrgAvailabilityLabel } from "./schema-org-availability.ts";

// A hand-written reader instead of a zod schema: this runs in the browser (extension, offscreen parser),
// where zod would be most of the bundle. Same rules as before: lenient where sites are loose (numbers as
// strings, brand as text or object, one item or a list), but a field present with the wrong shape
// rejects the node. Fields added later (identifiers, lowPrice, priceSpecification, hasVariant) are
// lenient instead, so a stray shape there never rejects a node that used to be read.

interface RawJsonLdOffer {
  price?: number;
  priceCurrency?: string;
  availability?: string;
  caseQuantity?: number;
}

interface RawJsonLdProduct {
  type: string[];
  name?: string;
  sku?: string;
  image?: string[];
  brand?: string;
  aggregateRating?: { ratingValue: number; ratingCount?: number };
  offers?: RawJsonLdOffer[];
  gtin?: string;
  mpn?: string;
  model?: string;
  /** A ProductGroup's `hasVariant` products, in page order. */
  variants?: RawJsonLdProduct[];
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
  /** First of gtin, gtin13, gtin14, gtin12, gtin8. */
  gtin: string | null;
  mpn: string | null;
  model: string | null;
  /** Units the price covers (`priceSpecification.referenceQuantity.value`), e.g. 6 for a six-pack. */
  caseQuantity: number | null;
}

const GTIN_FIELDS = ["gtin", "gtin13", "gtin14", "gtin12", "gtin8"] as const;

/**
 * Finds the schema.org Product in the page's JSON-LD blocks (top-level, array or @graph). A Product node
 * wins over a ProductGroup; a group without its own offer uses its first variant's.
 *
 * @example readJsonLdProduct(page)?.price // { amount: 84999, currency: "INR" }
 */
export function readJsonLdProduct(page: PageNode): JsonLdProduct | null {
  const nodes = page
    .findAll('script[type="application/ld+json"]')
    .flatMap((script) => parseJsonLdNodes(script.text()))
    .map(readRawProduct)
    .filter((raw) => raw !== null);
  const product = nodes.find(isType("Product")) ?? nodes.find(isType("ProductGroup"));
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

function isType(type: string): (raw: RawJsonLdProduct) => boolean {
  return (raw) => raw.type.includes(type);
}

function normalizeJsonLdProduct(raw: RawJsonLdProduct): JsonLdProduct {
  // Only a ProductGroup falls back to its variant, so a plain Product reads exactly as it always did.
  const variant = raw.type.includes("ProductGroup") ? raw.variants?.[0] : undefined;
  const offer = raw.offers?.[0] ?? variant?.offers?.[0];
  return {
    name: raw.name ?? variant?.name ?? null,
    sku: raw.sku ?? variant?.sku ?? null,
    brand: raw.brand ?? variant?.brand ?? null,
    images: raw.image ?? variant?.image ?? [],
    price: offerPrice(offer),
    availability: offer?.availability ? schemaOrgAvailabilityLabel(offer.availability) : null,
    rating: raw.aggregateRating
      ? { average: raw.aggregateRating.ratingValue, count: raw.aggregateRating.ratingCount ?? 0 }
      : null,
    gtin: raw.gtin ?? variant?.gtin ?? null,
    mpn: raw.mpn ?? variant?.mpn ?? null,
    model: raw.model ?? variant?.model ?? null,
    caseQuantity: offer?.caseQuantity ?? null,
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
      image: optional(fields.image, (value) => oneOrMany(value, imageUrl)),
      brand: optional(fields.brand, brandName),
      aggregateRating: optional(fields.aggregateRating, aggregateRating),
      offers: optional(fields.offers, (value) => oneOrMany(value, offer)),
      gtin: GTIN_FIELDS.map((field) => lenient(fields[field], identifier)).find((gtin) => gtin !== undefined),
      mpn: lenient(fields.mpn, identifier),
      model: lenient(fields.model, modelName),
      variants: lenient(fields.hasVariant, variants),
    };
  } catch (error) {
    if (error instanceof InvalidNode) return null;
    throw error;
  }
}

// An AggregateOffer has lowPrice instead of price; a priceSpecification can carry the price and case size.
function offer(value: unknown): RawJsonLdOffer {
  const fields = record(value);
  const specification = lenient(fields.priceSpecification, (present) => oneOrMany(present, priceSpecification))?.[0];
  return {
    price: optional(fields.price, price) ?? lenient(fields.lowPrice, price) ?? specification?.price,
    priceCurrency: optional(fields.priceCurrency, currencyCode) ?? specification?.priceCurrency,
    availability: optional(fields.availability, text),
    caseQuantity: specification?.caseQuantity,
  };
}

function priceSpecification(value: unknown): Omit<RawJsonLdOffer, "availability"> {
  const fields = record(value);
  return {
    price: lenient(fields.price, price),
    priceCurrency: lenient(fields.priceCurrency, currencyCode),
    caseQuantity: lenient(fields.referenceQuantity, (quantity) => number(record(quantity).value)),
  };
}

// A variant that does not read is dropped; the group itself still reads.
function variants(value: unknown): RawJsonLdProduct[] {
  return oneOrMany(value, readRawProduct).filter((variant) => variant !== null);
}

// Images come as URLs or as ImageObjects ({ url } or { contentUrl }).
function imageUrl(value: unknown): string {
  if (typeof value === "string") return value;
  const fields = record(value);
  return text(fields.url ?? fields.contentUrl);
}

function modelName(value: unknown): string {
  return nonEmpty(typeof value === "string" ? value : text(record(value).name));
}

// GTINs are sometimes written as JSON numbers; keep them as the digits they are.
function identifier(value: unknown): string {
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  return nonEmpty(text(value));
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

/** Like optional, but a wrong shape reads as absent instead of rejecting the node. */
function lenient<T>(value: unknown, read: (present: unknown) => T): T | undefined {
  try {
    return optional(value, read);
  } catch (error) {
    if (error instanceof InvalidNode) return undefined;
    throw error;
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvalidNode();
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== "string") throw new InvalidNode();
  return value;
}

function nonEmpty(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") throw new InvalidNode();
  return trimmed;
}

function currencyCode(value: unknown): string {
  const code = text(value);
  if (code.length !== 3) throw new InvalidNode();
  return code;
}

// Prices: a number, a numeric string, or a formatted one such as "1,299.00".
function price(value: unknown): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const formatted = typeof value === "string" ? parseAmount(value) : null;
  if (formatted === null) throw new InvalidNode();
  return formatted;
}

// Like JSON-LD in the wild (and zod's coerce): "84999" and 84999 both count; NaN and Infinity do not.
function number(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new InvalidNode();
  return parsed;
}
