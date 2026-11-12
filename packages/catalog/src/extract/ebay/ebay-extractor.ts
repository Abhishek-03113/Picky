import { parseMoney } from "../../money/parse-money.ts";
import { firstText, type PageNode } from "../../page/page-node.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { createLayeredExtractor, jsonLdSource, metaSource, namedSource } from "../shared/layered-reader.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { extractEbaySpecGroups } from "./ebay-specs.ts";
import { parseEbayProductUrl } from "./ebay-url.ts";

const ENDED = /this listing (?:has ended|was ended)/i;
const BID = /\bbid\b/i;

/**
 * What the listing's state says about buying it: "Listing ended" or "Auction: current bid", else null
 * (a plain fixed-price listing keeps the availability its JSON-LD gives).
 *
 * @example listingAvailability(page) // "Auction: current bid"
 */
export function listingAvailability(page: PageNode): string | null {
  if (ENDED.test(page.text())) return "Listing ended";
  if (page.findAll(".x-bid-price").length > 0) return "Auction: current bid";
  return BID.test(firstText(page, [".x-price-section", ".x-buybox"]) ?? "") ? "Auction: current bid" : null;
}

// First, so an auction's bid or an ended listing is never reported as an in-stock fixed price.
const listingStateSource = namedSource("ebay-listing-state", (page) => {
  const availability = listingAvailability(page);
  return availability === null ? null : { availability };
});

const ebayWidgetsSource = namedSource("ebay-widgets", (page) => {
  const priceText = firstText(page, [".x-price-primary"]);
  return {
    title: firstText(page, ["h1.x-item-title__mainTitle"]) ?? undefined,
    price: (priceText === null ? null : parseMoney(priceText, "USD")) ?? undefined,
  };
});

/**
 * eBay listing pages.
 *
 * @example createEbayExtractor(shoppingSite("ebay.com")).extract(parseHtmlPage(html), url, new Date())
 */
export function createEbayExtractor(site: SupportedSite): SiteExtractor {
  return createLayeredExtractor(site, {
    parseProductUrl: parseEbayProductUrl,
    sources: [listingStateSource, jsonLdSource, ebayWidgetsSource, metaSource],
    readSpecGroups: extractEbaySpecGroups,
  });
}
