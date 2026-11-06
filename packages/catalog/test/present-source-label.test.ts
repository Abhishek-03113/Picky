import { describe, expect, test } from "bun:test";
import { sourceLabel } from "../src/present/source-label.ts";

describe("sourceLabel", () => {
  test("maps each source to its display name", () => {
    expect(sourceLabel("amazon.in")).toBe("Amazon.in");
    expect(sourceLabel("amazon.com")).toBe("Amazon.com");
    expect(sourceLabel("flipkart.com")).toBe("Flipkart");
  });
});
