import { describe, expect, test } from "bun:test";
import { homeUrl } from "../src/home-url.ts";

describe("homeUrl", () => {
  test("forwards to the web app's homepage, keeping the section anchor", () => {
    expect(homeUrl("https://picky.example/", "#how")).toBe("https://picky.example/#how");
    expect(homeUrl("https://picky.example", "")).toBe("https://picky.example/");
  });

  test("falls back to the local web app when unset", () => {
    expect(homeUrl(undefined, "")).toBe("http://localhost:5173/");
    expect(homeUrl("  ", "#compare")).toBe("http://localhost:5173/#compare");
  });
});
