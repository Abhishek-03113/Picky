import type { ShoppingSite } from "./shopping-site.ts";
import { SHOPPING_SITES } from "./shopping-sites.ts";
import { shoppingStores, type ShoppingStore } from "./shopping-stores.ts";
import { siteDomain } from "./site-urls.ts";

// Indian English lists drop the Oxford comma: "Amazon, Croma and Flipkart".
const LIST_LOCALE = "en-IN";

export type ListJoin = "and" | "or";

/**
 * Store names for UI copy, each store once however many storefronts it has, so every sentence that lists
 * the stores updates when one is added.
 *
 * @example supportedStoresText("or") // "Amazon or Flipkart"
 */
export function supportedStoresText(join: ListJoin = "and", sites: readonly ShoppingSite[] = SHOPPING_SITES): string {
  return formatList(
    shoppingStores(sites).map((store) => store.name),
    join,
  );
}

/**
 * Store names with their domains where a store has several, for copy that must say exactly where Picky
 * works (permissions, privacy).
 *
 * @example supportedDomainsText() // "Amazon (amazon.in and amazon.com) and Flipkart"
 */
export function supportedDomainsText(join: ListJoin = "and", sites: readonly ShoppingSite[] = SHOPPING_SITES): string {
  return formatList(storeNamesWithDomains(sites), join);
}

/**
 * Each store's name with its domains where it has several, as list items.
 *
 * @example storeNamesWithDomains() // ["Amazon (amazon.in and amazon.com)", "Flipkart"]
 */
export function storeNamesWithDomains(sites: readonly ShoppingSite[] = SHOPPING_SITES): string[] {
  return shoppingStores(sites).map(storeNameWithDomains);
}

/**
 * The store's name, with its domains when it has more than one storefront.
 *
 * @example storeNameWithDomains(shoppingStores()[0]) // "Amazon (amazon.in and amazon.com)"
 */
export function storeNameWithDomains(store: ShoppingStore): string {
  if (store.sites.length === 1) return store.name;
  return `${store.name} (${formatList(store.sites.map(siteDomain), "and")})`;
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
