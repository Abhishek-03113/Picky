import { formatMoney } from "../present/money-format.ts";
import type { ProductSnapshot } from "../product-snapshot.ts";
import { winningPositions } from "./mark-best.ts";
import type { ComparisonCell } from "./types.ts";

/**
 * Price row: formatted amounts, the lowest flagged (ties all flagged, needs two prices). Nothing is
 * flagged when prices are in different currencies: ₹ and $ amounts are not comparable.
 *
 * @example buildPriceCells(snapshots) // [{ text: "₹27,490", isBest: true }, { text: null, isBest: false }]
 */
export function buildPriceCells(snapshots: readonly ProductSnapshot[]): ComparisonCell[] {
  const prices = snapshots.map((snapshot) => snapshot.price);
  const currencies = new Set(prices.flatMap((price) => (price === null ? [] : [price.currency])));
  const amounts = currencies.size > 1 ? prices.map(() => null) : prices.map((price) => price?.amount ?? null);
  const winners = winningPositions(amounts, "lower");
  return snapshots.map((snapshot, index) => ({
    text: snapshot.price === null ? null : formatMoney(snapshot.price),
    isBest: winners[index] ?? false,
  }));
}

/**
 * Rating row ("4.3 ★ · 2,140"). Never flagged: a 5.0 from three reviews is not "best".
 *
 * @example buildRatingCells(snapshots)[0] // { text: "4.3 ★ · 2,140", isBest: false }
 */
export function buildRatingCells(snapshots: readonly ProductSnapshot[]): ComparisonCell[] {
  return snapshots.map(({ rating }) => ({
    text: rating === null ? null : `${rating.average.toFixed(1)} ★ · ${rating.count.toLocaleString("en-IN")}`,
    isBest: false,
  }));
}
