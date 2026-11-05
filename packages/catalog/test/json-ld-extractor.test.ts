import { describe, expect, test } from "bun:test";
import { createJsonLdExtractor, type JsonLdSiteRules } from "../src/extract/shared/json-ld-extractor.ts";
import { parseHtmlPage } from "../src/page/cheerio-page.ts";
import type { SupportedSite } from "../src/sites/shopping-sites.ts";

// A made-up store, to show the least a JSON-LD store needs: a registry entry and its URL rules.
const SHOP: SupportedSite = {
  source: "flipkart.com",
  label: "Shop",
  brand: "Shop",
  reader: "flipkart",
  host: "www.shop.test",
  productPaths: ["/item/*"],
  productPagesHint: "/item/… pages",
  exampleUrl: "https://www.shop.test/item/42",
  currency: "INR",
};
const RULES: JsonLdSiteRules = {
  parseProductUrl: (pageUrl) => {
    const id = /^https:\/\/www\.shop\.test\/item\/(\d+)/.exec(pageUrl)?.[1];
    return id === undefined ? null : { productId: id, canonicalUrl: `https://www.shop.test/item/${id}` };
  },
};
const PRODUCT_LD = `<script type="application/ld+json">{"@type":"Product","name":"Kettle","brand":"Acme","image":"https://i/k.jpg","offers":{"price":"1499","priceCurrency":"INR","availability":"https://schema.org/InStock"}}</script>`;

describe("createJsonLdExtractor", () => {
  const extractor = createJsonLdExtractor(SHOP, RULES);

  test("owns the store's product URLs", () => {
    expect(extractor.productIdFromUrl("https://www.shop.test/item/42?ref=x")).toBe("42");
    expect(extractor.productIdFromUrl("https://www.shop.test/search?q=kettle")).toBeNull();
  });

  test("reads identity, price and images from JSON-LD, with no specs when the store has no reader", () => {
    const snapshot = extractor.extract(parseHtmlPage(PRODUCT_LD), "https://www.shop.test/item/42?ref=x", new Date(0));
    expect(snapshot).toMatchObject({
      externalId: "42",
      url: "https://www.shop.test/item/42",
      title: "Kettle",
      brand: "Acme",
      price: { amount: 1499, currency: "INR" },
      images: ["https://i/k.jpg"],
      specGroups: [],
      highlights: [],
    });
  });

  test("names the store when a URL or page is not a product", () => {
    expect(() => extractor.extract(parseHtmlPage(""), "https://example.com", new Date(0))).toThrow(
      '"https://example.com" is not a Shop product URL; expected https://www.shop.test/item/42',
    );
    expect(() => extractor.extract(parseHtmlPage("<p>captcha</p>"), SHOP.exampleUrl, new Date(0))).toThrow(
      "Shop page for 42 has no schema.org Product",
    );
  });
});
