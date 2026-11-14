import { SIGN_IN_REQUIRED_MESSAGE } from "./sign-in-required.ts";

const NO_STORE_ACCESS_PREFIX = "Picky is off on ";

/**
 * Shown when a link is on a beta store the shopper said "Not now" to: written for them, so it passes
 * through failureHint as is.
 *
 * @example noStoreAccessMessage("Walmart") // "Picky is off on Walmart. Turn it on in the extension's site access, then try again."
 */
export function noStoreAccessMessage(storeLabel: string): string {
  return `${NO_STORE_ACCESS_PREFIX}${storeLabel}. Turn it on in the extension's site access, then try again.`;
}

/** What to try when saving or loading failed for a reason written for logs, not for shoppers. */
export const RETRY_HINT = "Reload the page, then try again.";

/**
 * The line a shopper reads under a failure. The sign-in prompt and the store-access notice are already
 * written for them, so they pass through; any other reason (an HTTP status, a parser message) becomes the retry hint.
 *
 * @example failureHint("Picky API POST /api/products failed: HTTP 500") // "Reload the page, then try again."
 */
export function failureHint(reason: string): string {
  const forShoppers = reason === SIGN_IN_REQUIRED_MESSAGE || reason.startsWith(NO_STORE_ACCESS_PREFIX);
  return forShoppers ? reason : RETRY_HINT;
}
