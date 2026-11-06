import { describe, expect, test } from "bun:test";
import { extractAmazonColorOptions } from "../src/extract/amazon/amazon-color-options.ts";
import { parseHtmlPage } from "../src/page/cheerio-page.ts";
import { shoppingSite } from "../src/sites/shopping-sites.ts";

const AMAZON_IN = shoppingSite("amazon.in");

const SWATCH = "https://m.media-amazon.com/images/I/sw._SS64_.jpg";
const DETAILS = { price: { amount: 582, currency: "INR" }, availability: "In stock", image: "https://x.test/main.jpg" };

function swatch(asin: string, name: string, selected: boolean): string {
  return `<li data-asin="${asin}" data-initiallyselected="${selected}"><img alt="${name}" src="${SWATCH}"></li>`;
}

function colorRow(items: string): string {
  return `<div id="inline-twister-row-color_name"><ul>${items}</ul></div>`;
}

describe("extractAmazonColorOptions", () => {
  test("lists each colour's listing, giving the page's own colour its details", () => {
    const page = parseHtmlPage(colorRow(swatch("B076CKF1GB", "White", true) + swatch("B076CJV46V", "Blue", false)));
    expect(extractAmazonColorOptions(page, AMAZON_IN, DETAILS)).toEqual([
      {
        name: "White",
        externalId: "B076CKF1GB",
        url: "https://www.amazon.in/dp/B076CKF1GB",
        swatchImage: SWATCH,
        selected: true,
        ...DETAILS,
      },
      {
        name: "Blue",
        externalId: "B076CJV46V",
        url: "https://www.amazon.in/dp/B076CJV46V",
        swatchImage: SWATCH,
        selected: false,
        price: null,
        availability: null,
        image: null,
      },
    ]);
  });

  test("links each colour on the store the page came from", () => {
    const page = parseHtmlPage(colorRow(swatch("B1", "White", true) + swatch("B2", "Blue", false)));
    const options = extractAmazonColorOptions(page, shoppingSite("amazon.com"), DETAILS);
    expect(options.map((option) => option.url)).toEqual([
      "https://www.amazon.com/dp/B1",
      "https://www.amazon.com/dp/B2",
    ]);
  });

  test("drops repeated and id-less swatches", () => {
    const page = parseHtmlPage(
      colorRow(
        swatch("B1", "White", true) +
          swatch("B1", "White", true) +
          swatch("", "Ghost", false) +
          swatch("B2", "Blue", false),
      ),
    );
    expect(extractAmazonColorOptions(page, AMAZON_IN, DETAILS).map((option) => option.externalId)).toEqual([
      "B1",
      "B2",
    ]);
  });

  test("falls back to the swatch text when there is no image", () => {
    const page = parseHtmlPage(
      colorRow(
        `${swatch("B1", "White", true)}<li data-asin="B2"><span class="swatch-title-text-display">Navy</span></li>`,
      ),
    );
    expect(extractAmazonColorOptions(page, AMAZON_IN, DETAILS)[1]).toMatchObject({ name: "Navy", swatchImage: null });
  });

  test("returns [] when there is only one colour or none", () => {
    expect(extractAmazonColorOptions(parseHtmlPage(colorRow(swatch("B1", "White", true))), AMAZON_IN, DETAILS)).toEqual(
      [],
    );
    expect(extractAmazonColorOptions(parseHtmlPage("<p></p>"), AMAZON_IN, DETAILS)).toEqual([]);
  });
});
