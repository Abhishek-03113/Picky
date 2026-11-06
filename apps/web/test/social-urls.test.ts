import { describe, expect, test } from "bun:test";
import { siteOrigin } from "../social-urls.ts";

describe("site origin", () => {
  test("PICKY_SITE_URL wins, then Vercel's production domain, else none", () => {
    expect(siteOrigin({ PICKY_SITE_URL: "https://picky.example/app/", VERCEL_PROJECT_PRODUCTION_URL: "x.app" })).toBe(
      "https://picky.example",
    );
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "picky-web.vercel.app" })).toBe("https://picky-web.vercel.app");
    expect(siteOrigin({})).toBeNull();
  });
});
