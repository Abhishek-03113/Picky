import type { PageNode } from "../../page/page-node.ts";
import type { Highlight, Money, Spec, SpecGroup } from "../../product-snapshot.ts";
import { readEmbeddedJson } from "../shared/embedded-json.ts";
import { jsonAt, jsonList, jsonNumber, jsonText, statusCodeLabel } from "../shared/json-path.ts";
import { namedSource, type LayeredFields, type LayeredSource } from "../shared/layered-reader.ts";

const INITIAL_DATA = ["props", "pageProps", "initialData", "data"] as const;
const LIST_ITEM = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const TAG = /<[^>]+>/g;
const WHITESPACE_RUN = /\s+/g;
const HTML_ENTITY = /&(?:amp|lt|gt|quot|#39|nbsp);/g;
const HTML_ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

/**
 * Walmart's page state (`__NEXT_DATA__`) under `props.pageProps.initialData.data`, or undefined.
 *
 * @example jsonAt(walmartInitialData(page), ["product", "name"]) // "onn. 50\" 4K TV"
 */
export function walmartInitialData(page: PageNode): unknown {
  return jsonAt(readEmbeddedJson(page, { scriptId: "__NEXT_DATA__" }), INITIAL_DATA);
}

/**
 * Product fields from Walmart's page state: name, brand, current and was price, images, rating and
 * availability. `currency` is used when a price has no `currencyUnit`.
 *
 * @example walmartNextDataSource("USD")(page)?.price // { amount: 248, currency: "USD" }
 */
export function walmartNextDataSource(currency: string): LayeredSource {
  return namedSource("walmart-next-data", (page) => {
    const product = jsonAt(walmartInitialData(page), ["product"]);
    return product === undefined ? null : walmartProductFields(product, currency);
  });
}

/**
 * Maps a Walmart `product` state object to layered fields; values of the wrong shape are left out.
 *
 * @example walmartProductFields({ name: "TV", priceInfo: { currentPrice: { price: 248 } } }, "USD").price
 * // { amount: 248, currency: "USD" }
 */
export function walmartProductFields(product: unknown, currency: string): Partial<LayeredFields> {
  const average = jsonNumber(jsonAt(product, ["averageRating"]));
  const status = jsonText(jsonAt(product, ["availabilityStatus"]));
  return {
    title: jsonText(jsonAt(product, ["name"])),
    brand: jsonText(jsonAt(product, ["brand"])),
    price: walmartPrice(product, "currentPrice", currency),
    listPrice: walmartPrice(product, "wasPrice", currency),
    images: walmartImages(product),
    rating:
      average === undefined ? undefined : { average, count: jsonNumber(jsonAt(product, ["numberOfReviews"])) ?? 0 },
    availability: status === undefined ? undefined : statusCodeLabel(status),
  };
}

function walmartPrice(product: unknown, kind: "currentPrice" | "wasPrice", currency: string): Money | undefined {
  const priced = jsonAt(product, ["priceInfo", kind]);
  const amount = jsonNumber(jsonAt(priced, ["price"]));
  if (amount === undefined || amount <= 0) return undefined;
  return { amount, currency: jsonText(jsonAt(priced, ["currencyUnit"])) ?? currency };
}

function walmartImages(product: unknown): string[] {
  return jsonList(jsonAt(product, ["imageInfo", "allImages"]))
    .map((image) => jsonText(jsonAt(image, ["url"])))
    .filter((url): url is string => url !== undefined);
}

/**
 * The specifications list from Walmart's page state as one "Specifications" group; [] when absent.
 *
 * @example readWalmartSpecGroups(page) // [{ title: "Specifications", specs: [{ label: "Brand", value: "onn." }] }]
 */
export function readWalmartSpecGroups(page: PageNode): SpecGroup[] {
  const specs = jsonList(jsonAt(walmartInitialData(page), ["idml", "specifications"]))
    .map(walmartSpec)
    .filter((spec): spec is Spec => spec !== null);
  return specs.length === 0 ? [] : [{ title: "Specifications", specs }];
}

function walmartSpec(entry: unknown): Spec | null {
  const label = jsonText(jsonAt(entry, ["name"]));
  const value = jsonText(jsonAt(entry, ["value"]));
  return label === undefined || value === undefined ? null : { label, value };
}

/**
 * The bullet points of Walmart's short description (HTML `<li>` items in page state); [] when it has none.
 *
 * @example readWalmartHighlights(page) // [{ heading: null, text: "4K Ultra HD resolution" }]
 */
export function readWalmartHighlights(page: PageNode): Highlight[] {
  const html = jsonText(jsonAt(walmartInitialData(page), ["idml", "shortDescription"]));
  if (html === undefined) return [];
  return [...html.matchAll(LIST_ITEM)]
    .map((match) => htmlToText(match[1] ?? ""))
    .filter((text) => text !== "")
    .map((text) => ({ heading: null, text }));
}

function htmlToText(html: string): string {
  return html
    .replace(TAG, " ")
    .replace(HTML_ENTITY, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(WHITESPACE_RUN, " ")
    .trim();
}
