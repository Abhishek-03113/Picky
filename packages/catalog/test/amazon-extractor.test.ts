import { describe, expect, test } from "bun:test";
import { createAmazonExtractor, extractAmazonProduct } from "../src/extract/amazon/amazon-extractor.ts";
import { ProductPageError } from "../src/extract/product-page-error.ts";
import { parseHtmlPage } from "../src/page/cheerio-page.ts";
import { shoppingSite } from "../src/sites/shopping-sites.ts";

const AMAZON_IN = shoppingSite("amazon.in");
const AMAZON_COM = shoppingSite("amazon.com");

const CAPTURED_AT = new Date("2026-10-05T10:00:00Z");

describe("extractAmazonProduct on a non-product page", () => {
  test("names the ASIN and the expected page in the error", () => {
    const challenge = parseHtmlPage("<html><body>bm-verify</body></html>");
    expect(() => extractAmazonProduct(challenge, { asin: "B0FQG1YHYR" }, CAPTURED_AT, AMAZON_IN)).toThrow(
      new ProductPageError(
        "Amazon page for ASIN B0FQG1YHYR has no #productTitle; expected a product detail page, got a challenge, mobile or error page",
      ),
    );
  });

  test("falls back to the URL ASIN and the byline brand", () => {
    const page = parseHtmlPage(`<span id="productTitle">Widget</span><a id="bylineInfo">Brand: Acme</a>`);
    const snapshot = extractAmazonProduct(page, { asin: "B000000001" }, CAPTURED_AT, AMAZON_IN);
    expect(snapshot.externalId).toBe("B000000001");
    expect(snapshot.brand).toBe("Acme");
  });
});

describe("extractAmazonProduct on amazon.com", () => {
  test("stores under amazon.com with dollar prices and the .com URL", () => {
    const page = parseHtmlPage(
      `<span id="productTitle">Echo Dot</span>
       <span class="priceToPay"><span class="a-offscreen">$49.99</span></span>
       <span class="basisPrice"><span class="a-offscreen">$59.99</span></span>`,
    );
    const snapshot = extractAmazonProduct(page, { asin: "B08N5WRWNW" }, CAPTURED_AT, AMAZON_COM);
    expect(snapshot.source).toBe("amazon.com");
    expect(snapshot.url).toBe("https://www.amazon.com/dp/B08N5WRWNW");
    expect(snapshot.price).toEqual({ amount: 49.99, currency: "USD" });
    expect(snapshot.listPrice).toEqual({ amount: 59.99, currency: "USD" });
  });
});

describe.each([
  ["amazon.in", AMAZON_IN, "https://www.amazon.in/s?k=x"],
  ["amazon.com", AMAZON_COM, "https://www.amazon.com/s?k=x"],
] as const)("%s extractor", (_source, site, searchUrl) => {
  const extractor = createAmazonExtractor(site);
  test("reads the ASIN from product URLs only", () => {
    expect(extractor.source).toBe(site.source);
    expect(extractor.productIdFromUrl(extractor.exampleUrl)).not.toBeNull();
    expect(extractor.productIdFromUrl(searchUrl)).toBeNull();
  });

  test("refuses to extract a URL it does not own", () => {
    expect(() => extractor.extract(parseHtmlPage(""), "https://example.com", CAPTURED_AT)).toThrow(
      `"https://example.com" is not an ${site.label} product URL; expected ${site.exampleUrl}`,
    );
  });
});
