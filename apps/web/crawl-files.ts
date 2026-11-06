/**
 * robots.txt and sitemap.xml for search engines, generated at build time because a sitemap must list
 * absolute URLs and the production origin is only known then (see siteOrigin in social-urls.ts).
 */
import { PUBLIC_PAGES } from "./src/seo/public-pages.ts";

/** The pages worth indexing: the public ones. Sign-in and every signed-in page are left out. */
export const INDEXED_PATHS: readonly string[] = PUBLIC_PAGES.map((page) => page.path);

/** Signed-in pages and the API: a crawler only ever sees a redirect to sign-in there. */
const PRIVATE_PATH_PREFIXES: readonly string[] = ["/api/", "/products/", "/comparisons", "/login"];

/**
 * robots.txt: crawl the public pages, skip the private ones, and point at the sitemap when the origin is known.
 *
 * @example robotsTxt("https://picky.example") // "...Sitemap: https://picky.example/sitemap.xml\n"
 */
export function robotsTxt(origin: string | null): string {
  const lines = [
    "User-agent: *",
    "Allow: /",
    ...PRIVATE_PATH_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    ...(origin === null ? [] : ["", `Sitemap: ${origin}/sitemap.xml`]),
  ];
  return `${lines.join("\n")}\n`;
}

/**
 * sitemap.xml listing the indexed pages at `origin`.
 *
 * @example sitemapXml("https://picky.example") // "<?xml ...><urlset ...><url><loc>https://picky.example/</loc></url>..."
 */
export function sitemapXml(origin: string): string {
  const urls = INDEXED_PATHS.map((path) => `  <url><loc>${escapeXml(origin + path)}</loc></url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
