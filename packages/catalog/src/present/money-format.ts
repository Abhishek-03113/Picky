import type { Money } from "../product-snapshot.ts";

// Rupees get Indian grouping (₹1,24,900); every other currency reads the international way ($1,249.99).
const LOCALE_BY_CURRENCY: ReadonlyMap<string, string> = new Map([["INR", "en-IN"]]);
const DEFAULT_LOCALE = "en-US";

/**
 * Formats money the way the store's shoppers read it.
 *
 * @example formatMoney({ amount: 124900, currency: "INR" }) // "₹1,24,900"
 * @example formatMoney({ amount: 1249.99, currency: "USD" }) // "$1,249.99"
 */
export function formatMoney(money: Money): string {
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY.get(money.currency) ?? DEFAULT_LOCALE, {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: Number.isInteger(money.amount) ? 0 : 2,
  }).format(money.amount);
}

/**
 * Whole-percent discount of price against list price; null when there is no real discount.
 *
 * @example discountPercent({ amount: 90, currency: "INR" }, { amount: 100, currency: "INR" }) // 10
 */
export function discountPercent(price: Money | null, listPrice: Money | null): number | null {
  if (price === null || listPrice === null) return null;
  if (price.currency !== listPrice.currency || listPrice.amount <= price.amount) return null;
  return Math.round((1 - price.amount / listPrice.amount) * 100);
}

/**
 * How much cheaper the price is than the list price; null when there is no real, same-currency saving.
 *
 * @example savingsAmount({ amount: 90, currency: "INR" }, { amount: 100, currency: "INR" }) // { amount: 10, currency: "INR" }
 */
export function savingsAmount(price: Money | null, listPrice: Money | null): Money | null {
  if (price === null || listPrice === null) return null;
  if (price.currency !== listPrice.currency || listPrice.amount <= price.amount) return null;
  return { amount: listPrice.amount - price.amount, currency: price.currency };
}

/**
 * What the struck-through list price is called: "M.R.P." in India, "List price" elsewhere.
 *
 * @example listPriceLabel({ amount: 1299, currency: "USD" }) // "List price"
 */
export function listPriceLabel(listPrice: Money): string {
  return listPrice.currency === "INR" ? "M.R.P." : "List price";
}
