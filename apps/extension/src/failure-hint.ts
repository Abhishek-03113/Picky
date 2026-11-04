import { SIGN_IN_REQUIRED_MESSAGE } from "./sign-in-required.ts";

/** What to try when saving or loading failed for a reason written for logs, not for shoppers. */
export const RETRY_HINT = "Reload the page, then try again.";

/**
 * The line a shopper reads under a failure. The sign-in prompt is already written for them, so it
 * passes through; any other reason (an HTTP status, a parser message) becomes the retry hint.
 *
 * @example failureHint("Picky API POST /api/products failed: HTTP 500") // "Reload the page, then try again."
 */
export function failureHint(reason: string): string {
  return reason === SIGN_IN_REQUIRED_MESSAGE ? reason : RETRY_HINT;
}
