import type { SharedCartItem } from "@picky/catalog";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { currencyTotalLabel } from "../src/format/currency-total-label.ts";
import { groupByStore, Totals } from "../src/pages/shared-cart-page.tsx";

function sharedItem(source: string, externalId: string, amount: number, currency: string): SharedCartItem {
  return {
    source,
    externalId,
    url: `https://www.${source}/dp/${externalId}`,
    title: externalId,
    variant: null,
    image: null,
    price: { amount, currency },
    availability: null,
    quantity: 1,
  };
}

describe("currencyTotalLabel", () => {
  test("names the currency sign and the line count", () => {
    expect(currencyTotalLabel("INR", 2)).toBe("Items in ₹ (2)");
    expect(currencyTotalLabel("USD", 2)).toBe("Items in $ (2)");
  });
});

describe("shared cart", () => {
  const items = [
    sharedItem("amazon.in", "A1", 99900, "INR"),
    sharedItem("amazon.in", "A2", 100000, "INR"),
    sharedItem("amazon.com", "B1", 20000, "USD"),
    sharedItem("amazon.com", "B2", 23549, "USD"),
  ];

  test("totals are labelled by currency, never two plain Totals", () => {
    const html = renderToStaticMarkup(<Totals items={items} />);
    expect(html).toContain("<span>Items in ₹ (2)</span>");
    expect(html).toContain("<span>Items in $ (2)</span>");
    expect(html).not.toContain("<span>Total</span>");
  });

  test("two Amazon storefronts get distinct headings", () => {
    expect(groupByStore(items).map((group) => group.label)).toEqual(["Amazon · amazon.in", "Amazon · amazon.com"]);
    expect(groupByStore(items.slice(0, 2)).map((group) => group.label)).toEqual(["Amazon"]);
  });
});
