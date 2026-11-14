import { describe, expect, test } from "bun:test";
import { PRODUCT_SOURCES, isProductSource } from "../src/sites/shopping-sites.ts";

describe("isProductSource", () => {
  test("accepts every registered store and nothing else", () => {
    for (const source of PRODUCT_SOURCES) expect(isProductSource(source)).toBe(true);
    expect(isProductSource("example.org")).toBe(false);
    expect(isProductSource("")).toBe(false);
  });
});
