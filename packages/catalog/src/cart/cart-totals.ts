import type { Money } from "../product-snapshot.ts";
import { isUnavailable, lineTotal } from "./cart-item-state.ts";
import type { CartItem } from "./cart-types.ts";
import { sumByCurrency } from "./money-sums.ts";

export interface CartTotals {
  /** One total per currency; currencies are never converted or added together. */
  totals: Money[];
  /** Number of cart lines (a line of quantity 3 counts once). */
  itemCount: number;
  /** In-stock items with no price; they never change a total. */
  unpricedCount: number;
  /** Out-of-stock items; they are left out of totals. */
  unavailableCount: number;
}

export interface CartSavings {
  /** What the cart saves against the stores' list prices, per currency; only positive amounts. */
  againstListPrice: Money[];
  /** What the cart saves against the prices when the items were added, per currency; only positive amounts. */
  sinceAdded: Money[];
}

/**
 * Totals the in-stock priced items (price times quantity), one total per currency.
 *
 * @example cartTotals(items) // { totals: [{ amount: 2400, currency: "INR" }], itemCount: 1, unpricedCount: 0, unavailableCount: 0 }
 */
export function cartTotals(items: readonly CartItem[]): CartTotals {
  const available = items.filter((item) => !isUnavailable(item));
  const lines = available.map(lineTotal).filter((line): line is Money => line !== null);
  return {
    totals: sumByCurrency(lines),
    itemCount: items.length,
    unpricedCount: available.length - lines.length,
    unavailableCount: items.length - available.length,
  };
}

/**
 * How much the in-stock items save against list price and against the price when added.
 * Only same-currency, positive savings count; quantity multiplies.
 *
 * @example cartSavings(items) // { againstListPrice: [{ amount: 200, currency: "INR" }], sinceAdded: [] }
 */
export function cartSavings(items: readonly CartItem[]): CartSavings {
  const available = items.filter((item) => !isUnavailable(item));
  return {
    againstListPrice: sumByCurrency(available.flatMap((item) => positiveSaving(item.product.snapshot.listPrice, item))),
    sinceAdded: sumByCurrency(available.flatMap((item) => positiveSaving(item.priceWhenAdded, item))),
  };
}

/** The saving of the item's current price against a reference price, as zero or one amount. */
function positiveSaving(reference: Money | null, item: CartItem): Money[] {
  const { price } = item.product.snapshot;
  if (reference === null || price === null || reference.currency !== price.currency) return [];
  if (reference.amount <= price.amount) return [];
  return [{ amount: (reference.amount - price.amount) * item.quantity, currency: price.currency }];
}
