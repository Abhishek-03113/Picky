import type { ProductSnapshot } from "../product-snapshot.ts";
import type { ShoppingSite } from "../sites/shopping-site.ts";
import { SHOPPING_SITES, type SupportedSite } from "../sites/shopping-sites.ts";

const TITLE_WORD_LIMIT = 6;
const QUERY_PLACEHOLDER = "{query}";

/**
 * Stores with a search page, each of which gets a "Search <store>" row in comparisons.
 *
 * @example searchableSites().map((site) => site.label) // ["Flipkart"]
 */
export function searchableSites(sites: readonly SupportedSite[] = SHOPPING_SITES): SupportedSite[] {
  return sites.filter((site) => site.searchUrl !== undefined);
}

/**
 * Search URL for finding the same product on another store: brand plus the first words of the title
 * (where the model name lives), without parenthetical marketing detail. Null when the store has no search page.
 *
 * @example storeSearchUrl(shoppingSite("flipkart.com"), snapshot) // "https://www.flipkart.com/search?q=ASUS%20ProArt%20PA279CV%2027-inch"
 */
export function storeSearchUrl(site: ShoppingSite, snapshot: ProductSnapshot): string | null {
  if (site.searchUrl === undefined) return null;
  return site.searchUrl.replace(QUERY_PLACEHOLDER, encodeURIComponent(searchQuery(snapshot)));
}

function searchQuery(snapshot: ProductSnapshot): string {
  const headline = snapshot.title.replace(/\([^)]*\)/g, " ").split(/[,|–—]/)[0] ?? snapshot.title;
  const words = headline.split(/\s+/).filter((word) => word !== "");
  const brand = snapshot.brand ?? "";
  const startsWithBrand = brand !== "" && (words[0] ?? "").toLowerCase() === brand.toLowerCase();
  return [...(brand !== "" && !startsWithBrand ? [brand] : []), ...words].slice(0, TITLE_WORD_LIMIT).join(" ");
}
