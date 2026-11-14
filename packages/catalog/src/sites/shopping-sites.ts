import type { ShoppingSite } from "./shopping-site.ts";

const AMAZON_PRODUCT_PATHS = ["/dp/*", "/*/dp/*", "/gp/product/*", "/*/gp/product/*"] as const;

interface AmazonStorefront<Domain extends string> {
  /** Bare domain, also the stored source id, e.g. "amazon.in". */
  readonly domain: Domain;
  readonly currency: string;
  /** ASIN of a real product on this storefront, for the example URL. */
  readonly exampleAsin: string;
}

// Amazon is one store with a storefront per country. Every storefront shares the name, page reader and
// product paths, so reading another country is one line here plus its host permission.
const AMAZON_STOREFRONTS = [
  { domain: "amazon.in", currency: "INR", exampleAsin: "B0FQG1YHYR" },
  { domain: "amazon.com", currency: "USD", exampleAsin: "B08N5WRWNW" },
] as const satisfies readonly AmazonStorefront<string>[];

function amazonStorefront<Domain extends string>(storefront: AmazonStorefront<Domain>) {
  return {
    source: storefront.domain,
    label: "Amazon",
    brand: "Amazon",
    reader: "amazon",
    host: `www.${storefront.domain}`,
    productPaths: AMAZON_PRODUCT_PATHS,
    productPagesHint: "/dp/… pages",
    exampleUrl: `https://www.${storefront.domain}/dp/${storefront.exampleAsin}`,
    currency: storefront.currency,
  } as const satisfies ShoppingSite<Domain>;
}

// The one list to edit when Picky learns a new store; docs/adding-a-site.md has the full checklist.
const SITE_LIST = [
  ...AMAZON_STOREFRONTS.map(amazonStorefront),
  {
    source: "flipkart.com",
    label: "Flipkart",
    brand: "Flipkart",
    reader: "flipkart",
    host: "www.flipkart.com",
    productPaths: ["/*/p/*"],
    productPagesHint: "/p/… pages",
    exampleUrl: "https://www.flipkart.com/apple-iphone-17-white-256-gb/p/itm68ad8410784c7?pid=MOBHQV9YAZYYWY8A",
    currency: "INR",
    searchUrl: "https://www.flipkart.com/search?q={query}",
  },
  // Beta stores, after the established ones so store lists show those first.
  {
    source: "walmart.com",
    label: "Walmart",
    brand: "Walmart",
    reader: "walmart",
    host: "www.walmart.com",
    productPaths: ["/ip/*"],
    productPagesHint: "/ip/… pages",
    exampleUrl: "https://www.walmart.com/ip/5074872077",
    currency: "USD",
    searchUrl: "https://www.walmart.com/search?q={query}",
    status: "beta",
  },
  {
    source: "target.com",
    label: "Target",
    brand: "Target",
    reader: "target",
    host: "www.target.com",
    productPaths: ["/p/*"],
    productPagesHint: "/p/… pages",
    exampleUrl: "https://www.target.com/p/-/A-54191097",
    currency: "USD",
    searchUrl: "https://www.target.com/s?searchTerm={query}",
    status: "beta",
  },
  {
    source: "bestbuy.com",
    label: "Best Buy",
    brand: "Best Buy",
    reader: "bestbuy",
    host: "www.bestbuy.com",
    productPaths: ["/site/*", "/product/*"],
    productPagesHint: "/site/….p pages",
    exampleUrl: "https://www.bestbuy.com/site/6418599.p?skuId=6418599",
    currency: "USD",
    searchUrl: "https://www.bestbuy.com/site/searchpage.jsp?st={query}",
    status: "beta",
  },
  {
    source: "ebay.com",
    label: "eBay",
    brand: "eBay",
    reader: "ebay",
    host: "www.ebay.com",
    productPaths: ["/itm/*"],
    productPagesHint: "/itm/… pages",
    exampleUrl: "https://www.ebay.com/itm/256123456789",
    currency: "USD",
    searchUrl: "https://www.ebay.com/sch/i.html?_nkw={query}",
    status: "beta",
  },
  {
    source: "etsy.com",
    label: "Etsy",
    brand: "Etsy",
    reader: "etsy",
    host: "www.etsy.com",
    productPaths: ["/listing/*"],
    productPagesHint: "/listing/… pages",
    exampleUrl: "https://www.etsy.com/listing/1234567890",
    currency: "USD",
    searchUrl: "https://www.etsy.com/search?q={query}",
    status: "beta",
  },
] as const satisfies readonly ShoppingSite[];

/** Id of a storefront Picky reads, e.g. "amazon.in". Stored with every snapshot. */
export type ProductSource = (typeof SITE_LIST)[number]["source"];

/** Name of a page reader, e.g. "amazon": the key into src/extract/site-extractors.ts. */
export type SiteReader = (typeof SITE_LIST)[number]["reader"];

export type SupportedSite = ShoppingSite<ProductSource, SiteReader>;

/** Every storefront Picky reads, in display order (store filter, supported-site lists, copy). */
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
