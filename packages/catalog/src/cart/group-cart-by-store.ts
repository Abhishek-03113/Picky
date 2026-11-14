import type { Money, ProductSource } from "../product-snapshot.ts";
import { SHOPPING_SITES } from "../sites/index.ts";
import { isUnavailable, lineTotal } from "./cart-item-state.ts";
import type { CartItem } from "./cart-types.ts";
import { sumByCurrency } from "./money-sums.ts";

/** The cart items of one storefront. */
export interface CartStoreGroup {
  source: ProductSource;
  /** Store name, e.g. "Amazon"; "Amazon · amazon.in" when the cart holds several storefronts of the store. */
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
  const groups = SHOPPING_SITES.flatMap((site) => {
    const groupItems = items.filter((item) => item.product.snapshot.source === site.source);
    if (groupItems.length === 0) return [];
    return [{ source: site.source, label: site.label, items: groupItems, subtotals: subtotalsOf(groupItems) }];
  });
  return nameStorefrontsApart(groups);
}

/**
 * Where several groups share a store name (amazon.in and amazon.com), appends the storefront so the
 * headings differ; a store with one storefront keeps its plain name.
 *
 * @example nameStorefrontsApart([{ source: "amazon.in", label: "Amazon" }, { source: "amazon.com", label: "Amazon" }]).map((g) => g.label) // ["Amazon · amazon.in", "Amazon · amazon.com"]
 */
export function nameStorefrontsApart<Group extends { source: string; label: string }>(
  groups: readonly Group[],
): Group[] {
  return groups.map((group) =>
    groups.filter((other) => other.label === group.label).length > 1
      ? { ...group, label: `${group.label} · ${group.source}` }
      : group,
  );
}

function subtotalsOf(items: readonly CartItem[]): Money[] {
  const lines = items.filter((item) => !isUnavailable(item)).map(lineTotal);
  return sumByCurrency(lines.filter((line): line is Money => line !== null));
}
