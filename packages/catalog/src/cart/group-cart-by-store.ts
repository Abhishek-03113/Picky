import type { Money, ProductSource } from "../product-snapshot.ts";
import { SHOPPING_SITES } from "../sites/index.ts";
import { isUnavailable, lineTotal } from "./cart-item-state.ts";
import type { CartItem } from "./cart-types.ts";
import { sumByCurrency } from "./money-sums.ts";

/** The cart items of one storefront. */
export interface CartStoreGroup {
  source: ProductSource;
  /** Store name, e.g. "Amazon". */
  label: string;
  items: CartItem[];
  /** What the in-stock priced items cost, one entry per currency. */
  subtotals: Money[];
}

/**
 * Splits a cart into one group per storefront, in registry order; storefronts with no items are left out.
 * Item order inside a group is kept.
 *
 * @example groupCartByStore(items).map((group) => group.source) // ["amazon.in", "flipkart.com"]
 */
export function groupCartByStore(items: readonly CartItem[]): CartStoreGroup[] {
  return SHOPPING_SITES.flatMap((site) => {
    const groupItems = items.filter((item) => item.product.snapshot.source === site.source);
    if (groupItems.length === 0) return [];
    return [{ source: site.source, label: site.label, items: groupItems, subtotals: subtotalsOf(groupItems) }];
  });
}

function subtotalsOf(items: readonly CartItem[]): Money[] {
  const lines = items.filter((item) => !isUnavailable(item)).map(lineTotal);
  return sumByCurrency(lines.filter((line): line is Money => line !== null));
}
