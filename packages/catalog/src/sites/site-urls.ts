import type { ShoppingSite } from "./shopping-site.ts";
import { SHOPPING_SITES, type SupportedSite } from "./shopping-sites.ts";

/**
 * Hosts a site's URLs may use: the canonical one and the bare domain.
 *
 * @example siteHosts(shoppingSite("amazon.in")) // ["www.amazon.in", "amazon.in"]
 */
export function siteHosts(site: ShoppingSite): string[] {
  return [...new Set([site.host, siteDomain(site)])];
}

/**
 * The site's bare domain, as shoppers type it.
 *
 * @example siteDomain(shoppingSite("amazon.in")) // "amazon.in"
 */
export function siteDomain(site: ShoppingSite): string {
  return site.host.replace(/^www\./, "");
}

/**
 * The site whose host this URL is on, or null. Says nothing about whether it is a product page.
 *
 * @example siteForUrl("https://amazon.com/s?k=x")?.source // "amazon.com"
 */
export function siteForUrl(pageUrl: string, sites: readonly SupportedSite[] = SHOPPING_SITES): SupportedSite | null {
  const hostname = URL.parse(pageUrl)?.hostname;
  if (hostname === undefined) return null;
  return sites.find((site) => siteHosts(site).includes(hostname)) ?? null;
}

/**
 * Chrome host-permission patterns, one per site.
 *
 * @example siteHostPermissions() // ["https://www.amazon.in/*", "https://www.amazon.com/*", "https://www.flipkart.com/*"]
 */
export function siteHostPermissions(sites: readonly ShoppingSite[] = SHOPPING_SITES): string[] {
  return sites.map((site) => `https://${site.host}/*`);
}

/**
 * Chrome match patterns for product links (the right-click menu's targetUrlPatterns).
 *
 * @example productLinkPatterns()[0] // "https://www.amazon.in/dp/*"
 */
export function productLinkPatterns(sites: readonly ShoppingSite[] = SHOPPING_SITES): string[] {
  return sites.flatMap((site) => site.productPaths.map((path) => `https://${site.host}${path}`));
}

/**
 * Cheap "is this a product link?" test from the sites' product paths. The always-on content script uses
 * it, so it must stay free of extractor code; the extractor re-checks before anything is fetched.
 *
 * @example looksLikeProductLink("https://www.amazon.in/Some-Item/dp/B0FQG1YHYR") // true
 */
export function looksLikeProductLink(url: string, sites: readonly ShoppingSite[] = SHOPPING_SITES): boolean {
  const parsed = URL.parse(url);
  if (parsed === null || parsed.protocol !== "https:") return false;
  const site = sites.find((candidate) => siteHosts(candidate).includes(parsed.hostname));
  const path = `${parsed.pathname}${parsed.search}`;
  return site?.productPaths.some((pattern) => matchPatternPath(pattern).test(path)) ?? false;
}

// A Chrome match-pattern path: "*" matches any run of characters, everything else is literal.
function matchPatternPath(pattern: string): RegExp {
  const literal = pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${literal.join(".*")}$`);
}
