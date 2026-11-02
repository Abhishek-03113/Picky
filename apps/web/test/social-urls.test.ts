import { describe, expect, test } from "bun:test";
import { siteOrigin, withSocialUrls } from "../social-urls.ts";

describe("link-preview URLs", () => {
  const html = "<head><!-- picky:social-urls (filled in) --></head>";

  test("PICKY_SITE_URL wins, then Vercel's production domain, else none", () => {
    expect(siteOrigin({ PICKY_SITE_URL: "https://picky.example/app/", VERCEL_PROJECT_PRODUCTION_URL: "x.app" })).toBe(
      "https://picky.example",
    );
    expect(siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "picky-web.vercel.app" })).toBe("https://picky-web.vercel.app");
    expect(siteOrigin({})).toBeNull();
  });

  test("fills in absolute og:url and og:image, or drops the marker without an origin", () => {
    const filled = withSocialUrls(html, "https://picky.example");
    expect(filled).toContain('<meta property="og:image" content="https://picky.example/mascot.png" />');
    expect(filled).toContain('<meta property="og:url" content="https://picky.example/" />');
    expect(withSocialUrls(html, null)).toBe("<head></head>");
  });
});
