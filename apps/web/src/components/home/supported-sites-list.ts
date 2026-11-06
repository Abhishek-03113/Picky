import { SHOPPING_SITES } from "@picky/catalog/sites";

export interface SupportedSite {
  readonly name: string;
  readonly host: string;
}

/** Stores for the homepage, from the shopping-site registry (host without "www."). */
export const SUPPORTED_SITES: readonly SupportedSite[] = SHOPPING_SITES.map((site) => ({
  name: site.label,
  host: site.host.replace(/^www\./, ""),
}));
