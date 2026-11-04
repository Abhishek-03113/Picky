import type { ShoppingSite } from "./shopping-site.ts";

const AMAZON_PRODUCT_PATHS = ["/dp/*", "/*/dp/*", "/gp/product/*", "/*/gp/product/*"] as const;

// The one list to edit when Picky learns a new store; docs/adding-a-site.md has the full checklist.
const SITE_LIST = [
  {
    source: "amazon.in",
    label: "Amazon.in",
    brand: "Amazon",
    host: "www.amazon.in",
    productPaths: AMAZON_PRODUCT_PATHS,
    productPagesHint: "/dp/… pages",
    exampleUrl: "https://www.amazon.in/dp/B0FQG1YHYR",
    currency: "INR",
  },
  {
    source: "amazon.com",
    label: "Amazon.com",
    brand: "Amazon",
    host: "www.amazon.com",
    productPaths: AMAZON_PRODUCT_PATHS,
    productPagesHint: "/dp/… pages",
    exampleUrl: "https://www.amazon.com/dp/B08N5WRWNW",
    currency: "USD",
  },
  {
    source: "flipkart.com",
    label: "Flipkart",
    brand: "Flipkart",
    host: "www.flipkart.com",
    productPaths: ["/*/p/*"],
    productPagesHint: "/p/… pages",
    exampleUrl: "https://www.flipkart.com/apple-iphone-17-white-256-gb/p/itm68ad8410784c7?pid=MOBHQV9YAZYYWY8A",
    currency: "INR",
    searchUrl: "https://www.flipkart.com/search?q={query}",
  },
] as const satisfies readonly ShoppingSite[];

/** Id of a store Picky reads, e.g. "amazon.in". */
export type ProductSource = (typeof SITE_LIST)[number]["source"];

export type SupportedSite = ShoppingSite<ProductSource>;

/** Every store Picky reads, in display order (store filter, supported-site lists, copy). */
export const SHOPPING_SITES: readonly SupportedSite[] = SITE_LIST;

export const PRODUCT_SOURCES: readonly ProductSource[] = SHOPPING_SITES.map((site) => site.source);

const SITES_BY_SOURCE: ReadonlyMap<string, SupportedSite> = new Map(SHOPPING_SITES.map((site) => [site.source, site]));

/**
 * The registry entry for a source.
 *
 * @example shoppingSite("flipkart.com").label // "Flipkart"
 */
export function shoppingSite(source: ProductSource): SupportedSite {
  const site = SITES_BY_SOURCE.get(source);
  if (site === undefined) throw new RangeError(`Unknown product source "${source}"`);
  return site;
}
