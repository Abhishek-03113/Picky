import { describe, expect, test } from "bun:test";
import { INDEXED_PATHS, robotsTxt, sitemapXml } from "../crawl-files.ts";
import { EXTENSION_PATH, PRIVACY_PATH, requireSignedIn } from "../src/auth/route-guards.ts";
import { QueryClient } from "@tanstack/react-query";
import { FakeAuthClient } from "./fakes/fake-auth-client.ts";

describe("robots.txt", () => {
  test("allows the public pages, keeps crawlers off private ones and points at the sitemap", () => {
    expect(robotsTxt("https://picky.example")).toBe(
      [
        "User-agent: *",
        "Allow: /",
        "Disallow: /api/",
        "Disallow: /products/",
        "Disallow: /comparisons",
        "Disallow: /login",
        "",
        "Sitemap: https://picky.example/sitemap.xml",
        "",
      ].join("\n"),
    );
  });

  test("without a known origin there is no sitemap line", () => {
    expect(robotsTxt(null)).not.toContain("Sitemap:");
  });
});

describe("sitemap.xml", () => {
  test("lists each public page as an absolute URL", () => {
    const xml = sitemapXml("https://picky.example");
    expect(xml).toStartWith('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      "<loc>https://picky.example/</loc>",
      "<loc>https://picky.example/extension</loc>",
      "<loc>https://picky.example/privacy</loc>",
    ]);
  });

  test("lists only pages a signed-out visitor (a crawler) can open", async () => {
    expect(INDEXED_PATHS).toEqual(["/", EXTENSION_PATH, PRIVACY_PATH]);
    const signedOut = { queryClient: new QueryClient(), authClient: new FakeAuthClient(null) };
    for (const pathname of INDEXED_PATHS) await requireSignedIn(signedOut, { pathname, href: pathname });
  });
});
