// `@picky/catalog/sites`: the store registry and helpers built on it. Pure data and string helpers only,
// so the extension's content scripts can import it without pulling in extractors or zod.
export type { ShoppingSite } from "./shopping-site.ts";
export {
  isProductSource,
  PRODUCT_SOURCES,
  SHOPPING_SITES,
  shoppingSite,
  type ProductSource,
  type SiteReader,
  type SupportedSite,
} from "./shopping-sites.ts";
export { shoppingStores, type ShoppingStore } from "./shopping-stores.ts";
export {
  formatList,
  storeBrandsText,
  storeNameWithDomains,
  storeNamesWithDomains,
  supportedDomainsText,
  supportedStoresText,
  type ListJoin,
} from "./site-copy.ts";
export {
  looksLikeProductLink,
  productLinkPatterns,
  siteDomain,
  siteForUrl,
  siteHostPermissions,
  siteHosts,
} from "./site-urls.ts";
