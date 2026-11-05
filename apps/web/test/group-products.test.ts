import { describe, expect, test } from "bun:test";
import { groupProducts, priceBandName } from "../src/library/group-products.ts";
import { inr, makeSummary } from "./fakes/product-fixtures.ts";

const library = [
  makeSummary({ id: "m1", category: "Monitors", brand: "LG", price: inr(29999) }),
  makeSummary({ id: "h1", category: "Headphones", brand: "Sony", price: inr(9990), source: "flipkart.com" }),
  makeSummary({ id: "m2", category: "Monitors", brand: "Dell", price: inr(39999) }),
  makeSummary({ id: "x1", category: null, brand: null, price: null }),
];

const names = (key: Parameters<typeof groupProducts>[1]) => groupProducts(library, key).map((group) => group.name);

describe("groupProducts", () => {
  test("category: biggest first, uncategorised under Other, last", () => {
    expect(names("category")).toEqual(["Monitors", "Headphones", "Other"]);
  });

  test("keeps incoming order inside a group and gives stable ids", () => {
    const [monitors] = groupProducts(library, "category");
    expect(monitors?.products.map((product) => product.id)).toEqual(["m1", "m2"]);
    expect(monitors?.id).toBe("category:Monitors");
  });

  test("brand: ties sort A-Z, missing brand goes to Other", () => {
    expect(names("brand")).toEqual(["Dell", "LG", "Sony", "Other"]);
  });

  test("store: uses the store's display name", () => {
    expect(names("store")).toEqual(["Amazon", "Flipkart"]);
  });

  test("price: cheapest band first, unpriced last", () => {
    expect(names("price")).toEqual(["Under ₹25k", "₹25k – ₹35k", "Over ₹35k", "Price not shown"]);
  });

  test("none: one flat group; an empty library has no groups", () => {
    expect(groupProducts(library, "none")).toHaveLength(1);
    expect(groupProducts(library, "none")[0]?.products).toHaveLength(4);
    expect(groupProducts([], "category")).toEqual([]);
  });
});

describe("priceBandName", () => {
  test("band edges: <25k, 25-35k inclusive, >35k", () => {
    expect(priceBandName(inr(24999))).toBe("Under ₹25k");
    expect(priceBandName(inr(25000))).toBe("₹25k – ₹35k");
    expect(priceBandName(inr(35000))).toBe("₹25k – ₹35k");
    expect(priceBandName(inr(35001))).toBe("Over ₹35k");
    expect(priceBandName(null)).toBe("Price not shown");
  });

  test("other currencies get their own band, between rupee bands and unpriced", () => {
    expect(priceBandName({ amount: 299, currency: "USD" })).toBe("Priced in USD");
    const mixed = [
      ...library,
      makeSummary({ id: "u1", source: "amazon.com", price: { amount: 49.99, currency: "USD" } }),
    ];
    expect(groupProducts(mixed, "price").map((group) => group.name)).toEqual([
      "Under ₹25k",
      "₹25k – ₹35k",
      "Over ₹35k",
      "Priced in USD",
      "Price not shown",
    ]);
  });
});
