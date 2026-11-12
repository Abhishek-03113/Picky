import { parseMoney } from "../../money/parse-money.ts";
import { firstText } from "../../page/page-node.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { createLayeredExtractor, jsonLdSource, metaSource, namedSource } from "../shared/layered-reader.ts";
import type { SiteExtractor } from "../site-extractor.ts";
import { extractBestBuySpecGroups } from "./bestbuy-specs.ts";
import { parseBestBuyProductUrl } from "./bestbuy-url.ts";

const PRICE_SELECTORS = ['[data-testid="customer-price"] span', ".priceView-customer-price span"];

/** The price shown on the page, for pages whose JSON-LD omits it. */
const bestBuyPriceSource = namedSource("bestbuy-price", (page) => {
  const text = firstText(page, PRICE_SELECTORS);
  const price = text === null ? null : parseMoney(text, "USD");
  return price === null ? null : { price };
});

/**
 * Best Buy product pages.
 *
 * @example createBestBuyExtractor(shoppingSite("bestbuy.com")).extract(parseHtmlPage(html), url, new Date())
 */
export function createBestBuyExtractor(site: SupportedSite): SiteExtractor {
  return createLayeredExtractor(site, {
    parseProductUrl: parseBestBuyProductUrl,
    sources: [jsonLdSource, bestBuyPriceSource, metaSource],
    readSpecGroups: extractBestBuySpecGroups,
  });
}
