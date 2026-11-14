import type { Money } from "../product-snapshot.ts";

/**
 * Adds amounts per currency, in order of first appearance. Currencies are never converted or mixed.
 *
 * @example sumByCurrency([{ amount: 5, currency: "INR" }, { amount: 7, currency: "INR" }, { amount: 1, currency: "USD" }])
 * // [{ amount: 12, currency: "INR" }, { amount: 1, currency: "USD" }]
 */
export function sumByCurrency(amounts: readonly Money[]): Money[] {
  const totals = new Map<string, number>();
  for (const { amount, currency } of amounts) {
    totals.set(currency, roundToPaise((totals.get(currency) ?? 0) + amount));
  }
  return [...totals].map(([currency, amount]) => ({ amount, currency }));
}

/** Keeps floating-point noise out of sums of prices. */
function roundToPaise(amount: number): number {
  return Math.round(amount * 100) / 100;
}
