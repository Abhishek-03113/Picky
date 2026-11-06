import { looksLikeProductLink, supportedStoresText } from "@picky/catalog/sites";
import { ApiRequestError } from "../api/json-requester.ts";

const NOT_FOUND = 404;

/**
 * What a shopper reads when a page fails to load. The thrown message names ids and HTTP statuses for
 * the logs; the screen only says what happened and what to try.
 *
 * @example routeErrorMessage(new ApiRequestError('No product with id "x"', 404)) // "This product or comparison…"
 */
export function routeErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === NOT_FOUND) {
    return "This product or comparison isn't in your Picky account any more.";
  }
  return "Picky couldn't load this page. Check your connection, then try again.";
}

/**
 * What a shopper reads when saving a pasted link failed: a nudge toward a real product link when the
 * link is not one, else a retry hint. The extension's own reason is written for the logs.
 *
 * @example importErrorMessage("https://example.com") // "That link isn't a product. Paste…"
 */
export function importErrorMessage(pastedUrl: string): string {
  if (!looksLikeProductLink(pastedUrl.trim())) {
    return `That link isn't a product. Paste a link to one product on ${supportedStoresText("or")}.`;
  }
  return "Picky couldn't save that product. Reload this page, then try again.";
}
