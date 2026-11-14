import type { ExtensionSettings } from "../settings.ts";
import type { PageMark } from "./page-marks.ts";

/** What the pill offers on a product page. */
export type PillState =
  { kind: "save" } | { kind: "reading" } | { kind: "saved"; productId: string } | { kind: "in-cart"; quantity: number };

/** A "reading" mark older than this is from a save the worker never finished (it was stopped mid-way). */
const STALE_READING_MS = 2 * 60_000;

/**
 * The pill's state from the page's mark; `pending` is a click the worker has not answered yet.
 *
 * @example pillState({ state: "saved", productId: "p1", cartQuantity: 2 }, false, Date.now()) // { kind: "in-cart", quantity: 2 }
 */
export function pillState(mark: PageMark | null, pending: boolean, now: number): PillState {
  if (pending) return { kind: "reading" };
  if (mark?.state === "reading") return now - mark.since < STALE_READING_MS ? { kind: "reading" } : { kind: "save" };
  if (mark === null) return { kind: "save" };
  if (mark.cartQuantity > 0) return { kind: "in-cart", quantity: mark.cartQuantity };
  return { kind: "saved", productId: mark.productId };
}

/**
 * The pill's label, in shopper words.
 *
 * @example pillLabel({ kind: "in-cart", quantity: 2 }) // "In cart × 2"
 */
export function pillLabel(state: PillState): string {
  switch (state.kind) {
    case "save":
      return "Save to Picky";
    case "reading":
      return "Reading this page…";
    case "saved":
      return "Saved · Add to cart";
    case "in-cart":
      return `In cart × ${state.quantity}`;
  }
}

/**
 * Whether the pill shows on a page: a product page of a store the shopper has not hidden it on, with
 * "Show the Save button on store pages" on.
 *
 * @example showsPill({ isProductPage: true, source: "walmart.com", settings }) // true with the defaults
 */
export function showsPill(page: {
  isProductPage: boolean;
  source: string;
  settings: Pick<ExtensionSettings, "showSavePill" | "savePillHiddenOn">;
}): boolean {
  return page.isProductPage && page.settings.showSavePill && !page.settings.savePillHiddenOn.includes(page.source);
}

const MIN_BOTTOM = 12;
/** Room the pill needs above its bottom edge, so it is never dragged off the top. */
const PILL_HEIGHT = 56;
export const DEFAULT_PILL_BOTTOM = 24;

/**
 * Keeps a dragged position inside the window.
 *
 * @example clampBottom(5000, 800) // 744
 */
export function clampBottom(bottom: number, windowHeight: number): number {
  return Math.round(Math.min(Math.max(bottom, MIN_BOTTOM), Math.max(MIN_BOTTOM, windowHeight - PILL_HEIGHT)));
}
