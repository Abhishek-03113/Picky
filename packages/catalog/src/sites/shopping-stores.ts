import type { ShoppingSite } from "./shopping-site.ts";
import { SHOPPING_SITES } from "./shopping-sites.ts";

/** A store as shoppers know it, e.g. "Amazon", with the storefronts Picky reads for it. */
export interface ShoppingStore {
  readonly name: string;
  readonly sites: readonly ShoppingSite[];
}

/**
 * Storefronts grouped into stores by their shared name, in registry order. UI lists, the store filter and
 * shopper copy show stores; host permissions and stored ids stay per storefront.
 *
 * @example shoppingStores().map((store) => store.name) // ["Amazon", "Flipkart"]
 */
export function shoppingStores(sites: readonly ShoppingSite[] = SHOPPING_SITES): ShoppingStore[] {
  const byName = new Map<string, ShoppingSite[]>();
  for (const site of sites) byName.set(site.label, [...(byName.get(site.label) ?? []), site]);
  return [...byName].map(([name, storeSites]) => ({ name, sites: storeSites }));
}
