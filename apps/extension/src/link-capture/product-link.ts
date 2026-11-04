import { productLinkPatterns } from "@picky/catalog/sites";

// The cheap link check for the always-on content script. It comes from the registry module, not the
// catalog index, so extractor code and zod stay out of every store page; the worker re-checks with the
// real extractor before fetching anything.
export { looksLikeProductLink } from "@picky/catalog/sites";

/** Coarse Chrome match patterns for the context menu; the exact check is isSupportedProductUrl on click. */
export const PRODUCT_LINK_PATTERNS: readonly string[] = productLinkPatterns();

/**
 * A readable stand-in for a product's title, taken from the URL slug, for the "Reading …" toast before
 * the page is fetched.
 *
 * @example titleFromProductUrl("https://www.amazon.in/ASUS-ProArt-PA279CV/dp/B0FQG1YHYR") // "ASUS ProArt PA279CV"
 */
export function titleFromProductUrl(url: string): string {
  const segments = (URL.parse(url)?.pathname ?? "").split("/").filter((segment) => segment !== "");
  const slug = segments.find((segment) => segment.includes("-"));
  return slug === undefined ? "product" : decodeURIComponent(slug).replace(/-/g, " ");
}

export interface ClickedProductLink {
  url: string;
  label: string;
}

/**
 * The product link an Alt+click landed on, or null. Walks up from the click target to the nearest anchor.
 *
 * @example productLinkFromClick(event.target, looksLikeProductLink)
 */
export function productLinkFromClick(
  target: EventTarget | null,
  isSupported: (url: string) => boolean,
): ClickedProductLink | null {
  // Duck-typed rather than `instanceof Element`: the check must hold across realms (and in DOM test doubles).
  const closest = (target as Partial<Element> | null)?.closest;
  const anchor = typeof closest === "function" ? closest.call(target, "a[href]") : null;
  if (anchor === null) return null;
  const url = (anchor as HTMLAnchorElement).href;
  if (!isSupported(url)) return null;
  const label = (anchor.textContent ?? "").replace(/\s+/g, " ").trim();
  return { url, label: label === "" ? titleFromProductUrl(url) : label };
}
