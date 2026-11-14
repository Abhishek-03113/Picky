import { describe, expect, test } from "bun:test";
import type { CatalogComparisonSummary } from "@picky/catalog";
import { groupAction, groupMeta, priceRanges } from "../src/library/group-summary.ts";
import type { ProductGroup } from "../src/library/group-products.ts";
import { inr, makeSummary } from "./fakes/product-fixtures.ts";

const group = (...products: ReturnType<typeof makeSummary>[]): ProductGroup => ({
  id: "category:Monitors",
  name: "Monitors",
  products,
});
const comparison = (id: string, productIds: string[]): CatalogComparisonSummary => ({
  id,
  name: id,
  productIds,
  updatedAt: "u",
});

const usd = (amount: number) => ({ amount, currency: "USD" });

describe("priceRanges", () => {
  test("is the cheapest and dearest price, ignoring unpriced products", () => {
    const products = [makeSummary({ price: inr(30) }), makeSummary({ price: null }), makeSummary({ price: inr(10) })];
    expect(priceRanges(products)).toEqual([{ min: inr(10), max: inr(30) }]);
  });

  test("is empty when nothing has a price", () => {
    expect(priceRanges([makeSummary({ price: null })])).toEqual([]);
  });

  test("keeps one range per currency, in order of first appearance", () => {
    const products = [
      makeSummary({ price: usd(35.5) }),
      makeSummary({ price: inr(500) }),
      makeSummary({ price: usd(100) }),
    ];
    expect(priceRanges(products)).toEqual([
      { min: usd(35.5), max: usd(100) },
      { min: inr(500), max: inr(500) },
    ]);
  });
});

describe("groupMeta", () => {
  test("shows count and the rupee range", () => {
    const meta = groupMeta(group(makeSummary({ price: inr(19990) }), makeSummary({ price: inr(34499) })));
    expect(meta).toBe("2 products · ₹19,990 – ₹34,499");
  });

  test("collapses an equal range and drops it when there are no prices", () => {
    expect(groupMeta(group(makeSummary({ price: inr(500) })))).toBe("1 product · ₹500");
    expect(groupMeta(group(makeSummary({ price: null })))).toBe("1 product");
  });

  test("shows a range per currency without comparing across them", () => {
    const meta = groupMeta(
      group(
        makeSummary({ price: inr(124900) }),
        makeSummary({ price: inr(79999) }),
        makeSummary({ price: usd(399.99) }),
        makeSummary({ price: usd(35.5) }),
      ),
    );
    expect(meta).toBe("4 products · ₹79,999 – ₹1,24,900 · $35.50 – $399.99");
  });

  test("collapses a currency that has a single price", () => {
    const meta = groupMeta(group(makeSummary({ price: usd(35.5) }), makeSummary({ price: inr(500) })));
    expect(meta).toBe("2 products · $35.50 · ₹500");
  });
});

describe("groupAction", () => {
  const products = [makeSummary({ id: "a" }), makeSummary({ id: "b" })];

  test("offers to compare all when no comparison matches", () => {
    expect(groupAction(group(...products), [comparison("c1", ["a"]), comparison("c2", ["a", "b", "c"])])).toEqual({
      kind: "compare-all",
      label: "Compare all 2",
    });
  });

  test("opens the comparison holding exactly the group's products, in any order", () => {
    const action = groupAction(group(...products), [comparison("c1", ["b", "a"])]);
    expect(action).toMatchObject({ kind: "open", label: "Open comparison", comparison: { id: "c1" } });
  });
});
