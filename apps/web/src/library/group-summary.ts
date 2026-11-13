import {
  type CatalogComparisonSummary,
  type CatalogProductSummary,
  formatMoney,
  type Money,
  pluralize,
} from "@picky/catalog";
import type { ProductGroup } from "./group-products.ts";

export interface CurrencyPriceRange {
  min: Money;
  max: Money;
}

/**
 * Cheapest and dearest price per currency, in order of first appearance; empty when no product has a
 * price. Currencies are never converted or ranked against each other, like the cart's per-currency totals.
 *
 * @example priceRanges(products) // [{ min: { amount: 79999, currency: "INR" }, max: { amount: 124900, currency: "INR" } }, { min: { amount: 35.5, currency: "USD" }, max: { amount: 399.99, currency: "USD" } }]
 */
export function priceRanges(products: readonly CatalogProductSummary[]): CurrencyPriceRange[] {
  const ranges = new Map<string, CurrencyPriceRange>();
  for (const { price } of products) {
    if (price === null) continue;
    const range = ranges.get(price.currency);
    if (range === undefined) {
      ranges.set(price.currency, { min: price, max: price });
    } else {
      if (price.amount < range.min.amount) range.min = price;
      if (price.amount > range.max.amount) range.max = price;
    }
  }
  return [...ranges.values()];
}

function formatRange({ min, max }: CurrencyPriceRange): string {
  return min.amount === max.amount ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

/**
 * The grey line under a section title: one price range per currency present.
 *
 * @example groupMeta(group) // "1 product · ₹29,999"
 * @example groupMeta(mixedGroup) // "4 products · ₹79,999 – ₹1,24,900 · $35.50 – $399.99"
 */
export function groupMeta(group: ProductGroup): string {
  const count = pluralize(group.products.length, "product");
  return [count, ...priceRanges(group.products).map(formatRange)].join(" · ");
}

export type GroupAction =
  | { kind: "compare-all"; label: string }
  | { kind: "open"; label: "Open comparison"; comparison: CatalogComparisonSummary };

/**
 * The section's header action: open the comparison that already holds exactly this group's products,
 * otherwise offer to create one.
 *
 * @example groupAction(group, comparisons).kind // "open" | "compare-all"
 */
export function groupAction(group: ProductGroup, comparisons: readonly CatalogComparisonSummary[]): GroupAction {
  const wanted = new Set(group.products.map((product) => product.id));
  const existing = comparisons.find(
    (comparison) => comparison.productIds.length === wanted.size && comparison.productIds.every((id) => wanted.has(id)),
  );
  if (existing !== undefined) return { kind: "open", label: "Open comparison", comparison: existing };
  return { kind: "compare-all", label: `Compare all ${group.products.length}` };
}
