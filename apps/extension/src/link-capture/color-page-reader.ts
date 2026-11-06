import type { ColorOption, ProductSnapshot } from "@picky/catalog";
import { FetchHtmlFetcher } from "./html-fetcher.ts";
import { parseProductHtml, type HtmlDocumentParser } from "./parse-product-html.ts";

/** Reads one colour's own listing and returns the option with its price, stock and photo filled in. */
export type ReadColorOption = (option: ColorOption) => Promise<ColorOption>;

type FetchFunction = (input: string, init: RequestInit) => Promise<Response>;

/**
 * The option with what its own page says: price, availability and main photo.
 *
 * @example withColorPageDetails(blue, blueSnapshot).price // { amount: 604, currency: "INR" }
 */
export function withColorPageDetails(option: ColorOption, page: ProductSnapshot): ColorOption {
  return { ...option, price: page.price, availability: page.availability, image: page.images[0] ?? null };
}

/**
 * ReadColorOption for a host that has fetch and DOMParser: the Quick Look content script (same origin as the
 * listing) or the popup (extension host permissions). Downloads the page with the user's cookies and reads it
 * with the same extractor as a capture. Throws when the page is not a readable product page.
 *
 * @example const blue = await colorPageReader(fetch, new DOMParser())(blueOption)
 */
export function colorPageReader(fetchFunction: FetchFunction, parser: HtmlDocumentParser): ReadColorOption {
  const fetcher = new FetchHtmlFetcher(fetchFunction);
  return async (option) => {
    const result = parseProductHtml(parser, await fetcher.fetchHtml(option.url), option.url, new Date());
    if (!result.ok) throw new Error(result.message);
    return withColorPageDetails(option, result.snapshot);
  };
}
