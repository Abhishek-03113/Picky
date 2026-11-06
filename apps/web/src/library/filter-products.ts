import { sourceLabel, type CatalogProductSummary } from "@picky/catalog";
import type { StoreFilter } from "../format/source-label.ts";

/**
 * Products from the chosen store, every storefront of it ("Amazon" keeps amazon.in and amazon.com);
 * "all" keeps everything.
 *
 * @example filterProductsByStore(products, "Flipkart") // Flipkart rows only
 */
export function filterProductsByStore(
  products: readonly CatalogProductSummary[],
  store: StoreFilter,
): CatalogProductSummary[] {
  if (store === "all") return [...products];
  return products.filter((product) => sourceLabel(product.source) === store);
}
