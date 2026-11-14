import { parseMoney } from "../../money/parse-money.ts";
import { firstText, type PageNode } from "../../page/page-node.ts";
import type { Highlight } from "../../product-snapshot.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import {
  createLayeredExtractor,
  jsonLdSource,
  metaSource,
  namedSource,
  type LayeredSource,
} from "../shared/layered-reader.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { parseEtsyProductUrl } from "./etsy-url.ts";

const IMAGE_SIZE = /\/il_(?:\d+x\d+|\d+xN)\./;

/**
 * Upgrades an Etsy image URL to the full-size rendition; other URLs pass through.
 *
 * @example fullSizeEtsyImage("https://i.etsystatic.com/1/r/il_570xN.123_abc.jpg") // ".../il_fullxfull.123_abc.jpg"
 */
export function fullSizeEtsyImage(url: string): string {
  return url.replace(IMAGE_SIZE, "/il_fullxfull.");
}

function withFullSizeImages(source: LayeredSource): LayeredSource {
  return namedSource(source.sourceName ?? "source", (page) => {
    const fields = source(page);
    return fields?.images === undefined ? fields : { ...fields, images: fields.images.map(fullSizeEtsyImage) };
  });
}

const etsyWidgetsSource = namedSource("etsy-widgets", (page) => {
  const priceText = firstText(page, ['[data-buy-box-region="price"] p', ".wt-text-title-larger"]);
  return {
    title: firstText(page, ['h1[data-buy-box-listing-title="true"]']) ?? undefined,
    price: (priceText === null ? null : parseMoney(priceText, "USD")) ?? undefined,
  };
});

/**
 * The "Highlights" list items, when the listing has them.
 *
 * @example readEtsyHighlights(page) // [{ heading: null, text: "Handmade" }]
 */
export function readEtsyHighlights(page: PageNode): Highlight[] {
  return page
    .findAll('[data-appears-component-name="listing_page_highlights"] li, #product-details-content-toggle li')
    .map((item) => item.text())
    .filter((text) => text !== "")
    .map((text) => ({ heading: null, text }));
}

/**
 * Etsy listing pages.
 *
 * @example createEtsyExtractor(shoppingSite("etsy.com")).extract(parseHtmlPage(html), url, new Date())
 */
export function createEtsyExtractor(site: SupportedSite): SiteExtractor {
  return createLayeredExtractor(site, {
    parseProductUrl: parseEtsyProductUrl,
    sources: [withFullSizeImages(jsonLdSource), etsyWidgetsSource, withFullSizeImages(metaSource)],
    readHighlights: readEtsyHighlights,
  });
}
