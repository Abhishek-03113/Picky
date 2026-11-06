import { describe, expect, test } from "bun:test";
import { canonicalAmazonUrl, parseAmazonProductUrl } from "../src/extract/amazon/amazon-url.ts";
import { shoppingSite } from "../src/sites/shopping-sites.ts";

const AMAZON_IN = shoppingSite("amazon.in");
const AMAZON_COM = shoppingSite("amazon.com");

describe("parseAmazonProductUrl", () => {
  test("reads the ASIN from /dp/ and /gp/product/ paths", () => {
    expect(
      parseAmazonProductUrl("https://www.amazon.in/Apple-iPhone-17/dp/B0FQG1YHYR/ref=sr_1_10?x=1", AMAZON_IN),
    ).toEqual({ asin: "B0FQG1YHYR" });
    expect(parseAmazonProductUrl("https://amazon.in/gp/product/B0FQG1YHYR", AMAZON_IN)).toEqual({ asin: "B0FQG1YHYR" });
  });

  test("reads amazon.com URLs on the amazon.com storefront only", () => {
    expect(parseAmazonProductUrl("https://www.amazon.com/Echo-Dot/dp/B08N5WRWNW/ref=x", AMAZON_COM)).toEqual({
      asin: "B08N5WRWNW",
    });
    expect(parseAmazonProductUrl("https://amazon.com/gp/product/B08N5WRWNW", AMAZON_COM)).toEqual({
      asin: "B08N5WRWNW",
    });
    expect(parseAmazonProductUrl("https://www.amazon.in/dp/B08N5WRWNW", AMAZON_COM)).toBeNull();
  });

  test("rejects other hosts, non-product paths and junk", () => {
    expect(parseAmazonProductUrl("https://www.amazon.com/dp/B0FQG1YHYR", AMAZON_IN)).toBeNull();
    expect(parseAmazonProductUrl("https://www.amazon.co.uk/dp/B0FQG1YHYR", AMAZON_COM)).toBeNull();
    expect(parseAmazonProductUrl("https://www.amazon.in/s?k=iphone+17", AMAZON_IN)).toBeNull();
    expect(parseAmazonProductUrl("not a url", AMAZON_IN)).toBeNull();
  });
});

describe("canonicalAmazonUrl", () => {
  test("drops slug and tracking, keeping the storefront host", () => {
    expect(canonicalAmazonUrl("B0FQG1YHYR", AMAZON_IN)).toBe("https://www.amazon.in/dp/B0FQG1YHYR");
    expect(canonicalAmazonUrl("B08N5WRWNW", AMAZON_COM)).toBe("https://www.amazon.com/dp/B08N5WRWNW");
  });
});
