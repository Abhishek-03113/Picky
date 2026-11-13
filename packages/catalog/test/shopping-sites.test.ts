import { describe, expect, test } from "bun:test";
import { findSiteExtractor } from "../src/extract/extract-product.ts";
import { SITE_EXTRACTORS } from "../src/extract/site-extractors.ts";
import { PRODUCT_SOURCES, SHOPPING_SITES, shoppingSite, type ProductSource } from "../src/sites/shopping-sites.ts";
import {
  formatList,
  storeBrandsText,
  storeNamesWithDomains,
  supportedDomainsText,
  supportedStoresText,
} from "../src/sites/site-copy.ts";
import { shoppingStores } from "../src/sites/shopping-stores.ts";
import {
  looksLikeProductLink,
  productLinkPatterns,
  siteForUrl,
  siteHostPermissions,
  siteHosts,
} from "../src/sites/site-urls.ts";

// Guards every registry entry, so a new site that is half set up fails here with a pointed message.
describe.each(SHOPPING_SITES.map((site) => [site.source, site] as const))("registry entry %s", (_source, site) => {
  test("has a reader, and the reader owns the example URL", () => {
    expect(findSiteExtractor(site.exampleUrl)?.source).toBe(site.source);
  });

  test("the example URL passes the cheap product-link check", () => {
    expect(looksLikeProductLink(site.exampleUrl)).toBe(true);
  });

  test("host, paths and search URL are well formed", () => {
    expect(site.host).toMatch(/^[a-z0-9.-]+$/);
    expect(new URL(site.exampleUrl).hostname).toBe(site.host);
    for (const path of site.productPaths) expect(path).toStartWith("/");
    if (site.searchUrl !== undefined) expect(site.searchUrl).toContain("{query}");
    expect(site.currency).toMatch(/^[A-Z]{3}$/);
  });
});

describe("SHOPPING_SITES", () => {
  test("sources and hosts are unique, and the extractors follow registry order", () => {
    expect(new Set(PRODUCT_SOURCES).size).toBe(PRODUCT_SOURCES.length);
    const hosts = SHOPPING_SITES.flatMap(siteHosts);
    expect(new Set(hosts).size).toBe(hosts.length);
    expect(SITE_EXTRACTORS.map((extractor) => extractor.source)).toEqual([...PRODUCT_SOURCES]);
  });

  test("Amazon is one store: storefronts share name and reader, keep their own id, host and currency", () => {
    const amazon = SHOPPING_SITES.filter((site) => site.reader === "amazon");
    expect(amazon.map((site) => site.source)).toEqual(["amazon.in", "amazon.com"]);
    expect(new Set(amazon.map((site) => site.label))).toEqual(new Set(["Amazon"]));
    expect(amazon.map((site) => site.currency)).toEqual(["INR", "USD"]);
    expect(findSiteExtractor("https://www.amazon.com/dp/B08N5WRWNW")?.source).toBe("amazon.com");
    expect(findSiteExtractor("https://amazon.in/dp/B0FQG1YHYR")?.source).toBe("amazon.in");
  });

  test("shoppingStores groups storefronts by store name, in registry order", () => {
    const stores = shoppingStores();
    expect(stores.map((store) => store.name)).toEqual([
      "Amazon",
      "Flipkart",
      "Walmart",
      "Target",
      "Best Buy",
      "eBay",
      "Etsy",
    ]);
    expect(stores[0]?.sites.map((site) => site.source)).toEqual(["amazon.in", "amazon.com"]);
  });

  test("shoppingSite looks a source up and refuses unknown ones", () => {
    expect(shoppingSite("amazon.com").currency).toBe("USD");
    expect(() => shoppingSite("amazon.co.uk" as ProductSource)).toThrow('Unknown product source "amazon.co.uk"');
  });
});

describe("site URLs", () => {
  test("siteForUrl matches canonical and bare hosts only", () => {
    expect(siteForUrl("https://amazon.com/s?k=x")?.source).toBe("amazon.com");
    expect(siteForUrl("https://www.flipkart.com/")?.source).toBe("flipkart.com");
    expect(siteForUrl("https://www.amazon.co.uk/dp/B08N5WRWNW")).toBeNull();
    expect(siteForUrl("not a url")).toBeNull();
  });

  test("Chrome patterns come from each site's host and product paths", () => {
    expect(siteHostPermissions()).toEqual([
      "https://www.amazon.in/*",
      "https://www.amazon.com/*",
      "https://www.flipkart.com/*",
      "https://www.walmart.com/*",
      "https://www.target.com/*",
      "https://www.bestbuy.com/*",
      "https://www.ebay.com/*",
      "https://www.etsy.com/*",
    ]);
    expect(productLinkPatterns()).toContain("https://www.amazon.com/*/gp/product/*");
    expect(productLinkPatterns()).toContain("https://www.flipkart.com/*/p/*");
  });

  test("looksLikeProductLink follows the product paths, on https and known hosts only", () => {
    expect(looksLikeProductLink("https://amazon.in/x/dp/B0FQG1YHYR")).toBe(true);
    expect(looksLikeProductLink("https://www.amazon.com/gp/product/B08N5WRWNW?th=1")).toBe(true);
    expect(looksLikeProductLink("https://www.flipkart.com/phone/p/itm1?pid=MOB1")).toBe(true);
    expect(looksLikeProductLink("https://www.amazon.in/s?k=dp")).toBe(false);
    expect(looksLikeProductLink("http://www.amazon.in/dp/B0FQG1YHYR")).toBe(false);
    expect(looksLikeProductLink("https://evil.test/dp/B0FQG1YHYR")).toBe(false);
  });
});

describe("site copy", () => {
  test("lists every store, and every company once", () => {
    expect(supportedStoresText()).toBe("Amazon, Flipkart, Walmart, Target, Best Buy, eBay and Etsy");
    expect(supportedStoresText("or")).toBe("Amazon, Flipkart, Walmart, Target, Best Buy, eBay or Etsy");
    expect(storeBrandsText("or")).toBe("Amazon, Flipkart, Walmart, Target, Best Buy, eBay or Etsy");
  });

  test("names Amazon's domains where copy must say exactly where Picky works", () => {
    expect(supportedDomainsText()).toBe(
      "Amazon (amazon.in and amazon.com), Flipkart, Walmart, Target, Best Buy, eBay and Etsy",
    );
    expect(storeNamesWithDomains()).toEqual([
      "Amazon (amazon.in and amazon.com)",
      "Flipkart",
      "Walmart",
      "Target",
      "Best Buy",
      "eBay",
      "Etsy",
    ]);
  });

  test("formatList handles short lists", () => {
    expect(formatList(["a"], "and")).toBe("a");
    expect(formatList(["a", "b"], "or")).toBe("a or b");
  });
});
