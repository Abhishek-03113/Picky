import { describe, expect, test } from "bun:test";
import { sourceLabel } from "../src/present/source-label.ts";

describe("sourceLabel", () => {
  test("maps each source to its store name; Amazon storefronts share one", () => {
    expect(sourceLabel("amazon.in")).toBe("Amazon");
    expect(sourceLabel("amazon.com")).toBe("Amazon");
    expect(sourceLabel("flipkart.com")).toBe("Flipkart");
  });
});
