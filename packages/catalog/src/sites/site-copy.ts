import type { ShoppingSite } from "./shopping-site.ts";
import { SHOPPING_SITES } from "./shopping-sites.ts";

// Indian English lists drop the Oxford comma: "Amazon.in, Amazon.com and Flipkart".
const LIST_LOCALE = "en-IN";

export type ListJoin = "and" | "or";

/**
 * Store names for UI copy, so every sentence that lists the stores updates when one is added.
 *
 * @example supportedStoresText("or") // "Amazon.in, Amazon.com or Flipkart"
 */
export function supportedStoresText(join: ListJoin = "and", sites: readonly ShoppingSite[] = SHOPPING_SITES): string {
  return formatList(
    sites.map((site) => site.label),
    join,
  );
}

/**
 * The companies behind the stores, each once, for "not affiliated with …" notices.
 *
 * @example storeBrandsText("or") // "Amazon or Flipkart"
 */
export function storeBrandsText(join: ListJoin = "and", sites: readonly ShoppingSite[] = SHOPPING_SITES): string {
  return formatList([...new Set(sites.map((site) => site.brand))], join);
}

/**
 * Joins words the way the UI copy does.
 *
 * @example formatList(["a", "b", "c"], "or") // "a, b or c"
 */
export function formatList(items: readonly string[], join: ListJoin): string {
  const type = join === "and" ? "conjunction" : "disjunction";
  return new Intl.ListFormat(LIST_LOCALE, { type }).format(items);
}
