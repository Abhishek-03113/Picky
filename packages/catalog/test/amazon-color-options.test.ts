import { describe, expect, test } from "bun:test";
import { extractAmazonColorOptions } from "../src/extract/amazon/amazon-color-options.ts";
import { parseHtmlPage } from "../src/page/cheerio-page.ts";

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
    expect(extractAmazonColorOptions(page, DETAILS)).toEqual([
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

  test("drops repeated and id-less swatches", () => {
    const page = parseHtmlPage(
      colorRow(
        swatch("B1", "White", true) +
          swatch("B1", "White", true) +
          swatch("", "Ghost", false) +
          swatch("B2", "Blue", false),
      ),
    );
    expect(extractAmazonColorOptions(page, DETAILS).map((option) => option.externalId)).toEqual(["B1", "B2"]);
  });

  test("falls back to the swatch text when there is no image", () => {
    const page = parseHtmlPage(
      colorRow(
        `${swatch("B1", "White", true)}<li data-asin="B2"><span class="swatch-title-text-display">Navy</span></li>`,
      ),
    );
    expect(extractAmazonColorOptions(page, DETAILS)[1]).toMatchObject({ name: "Navy", swatchImage: null });
  });

  test("returns [] when there is only one colour or none", () => {
    expect(extractAmazonColorOptions(parseHtmlPage(colorRow(swatch("B1", "White", true))), DETAILS)).toEqual([]);
    expect(extractAmazonColorOptions(parseHtmlPage("<p></p>"), DETAILS)).toEqual([]);
  });
});
