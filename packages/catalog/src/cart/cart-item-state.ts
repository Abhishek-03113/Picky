import { availabilityTone } from "../present/availability-tone.ts";
import type { Money } from "../product-snapshot.ts";
import type { CartItem } from "./cart-types.ts";

/**
 * True when the store says the item cannot be bought right now. Unknown wording counts as available.
 *
 * @example isUnavailable(item) // true when the item's availability reads "Currently unavailable."
 */
export function isUnavailable(item: CartItem): boolean {
  const { availability } = item.product.snapshot;
  return availability !== null && availabilityTone(availability) === "out-of-stock";
}

/**
 * The item's price times its quantity; null when the item has no price.
 *
 * @example lineTotal(item) // { amount: 2400, currency: "INR" } for a ₹1,200 item with quantity 2
 */
export function lineTotal(item: CartItem): Money | null {
  const { price } = item.product.snapshot;
  if (price === null) return null;
  return { amount: price.amount * item.quantity, currency: price.currency };
}
