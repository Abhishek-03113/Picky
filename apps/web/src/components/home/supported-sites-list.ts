import { shoppingStores, siteDomain } from "@picky/catalog/sites";

export interface SupportedSite {
  readonly name: string;
  /** The store's domains, e.g. ["amazon.in", "amazon.com"]. */
  readonly domains: readonly string[];
}

/** Stores for the homepage, from the shopping-site registry, each store once. */
export const SUPPORTED_SITES: readonly SupportedSite[] = shoppingStores().map((store) => ({
  name: store.name,
  domains: store.sites.map(siteDomain),
}));
