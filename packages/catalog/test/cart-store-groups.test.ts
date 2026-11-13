import { describe, expect, test } from "bun:test";
import { groupCartByStore, nameStorefrontsApart, type CartItem, type CatalogProduct } from "../src/index.ts";
import { snapshotWith } from "./compare-support.ts";

function cartItem(source: "amazon.in" | "amazon.com" | "flipkart.com", id: string): CartItem {
  const product: CatalogProduct = {
    id,
    snapshot: snapshotWith(id, [], { source }),
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  };
  return { product, quantity: 1, note: null, priceWhenAdded: null, addedAt: "2026-10-01T00:00:00Z" };
}

describe("groupCartByStore labels", () => {
  test("a cart with one storefront per store keeps the plain store name", () => {
    const groups = groupCartByStore([cartItem("amazon.in", "a"), cartItem("flipkart.com", "f")]);
    expect(groups.map((group) => group.label)).toEqual(["Amazon", "Flipkart"]);
  });

  test("two storefronts of one store are named apart, other stores stay plain", () => {
    const groups = groupCartByStore([
      cartItem("amazon.com", "us"),
      cartItem("amazon.in", "in"),
      cartItem("flipkart.com", "f"),
    ]);
    expect(groups.map((group) => group.label)).toEqual(["Amazon · amazon.in", "Amazon · amazon.com", "Flipkart"]);
    expect(groups.map((group) => group.source)).toEqual(["amazon.in", "amazon.com", "flipkart.com"]);
  });
});

describe("nameStorefrontsApart", () => {
  test("leaves unique labels alone and suffixes only the repeated ones", () => {
    const groups = [
      { source: "amazon.in", label: "Amazon" },
      { source: "amazon.com", label: "Amazon" },
      { source: "x.example", label: "X" },
    ];
    expect(nameStorefrontsApart(groups).map((group) => group.label)).toEqual([
      "Amazon · amazon.in",
      "Amazon · amazon.com",
      "X",
    ]);
  });
});
