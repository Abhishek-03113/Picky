import { shoppingSite, type ProductSource } from "../sites/shopping-sites.ts";

/**
 * Human-readable store name.
 *
 * @example sourceLabel("flipkart.com") // "Flipkart"
 */
export function sourceLabel(source: ProductSource): string {
  return shoppingSite(source).label;
}
