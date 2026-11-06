/**
 * Everything the apps need to know about one store, as plain data: no parsing code, no zod, so the
 * extension's always-on content script and the web app can import it cheaply. The page reader for a
 * site lives in src/extract/ and is registered in src/extract/site-extractors.ts.
 */
export interface ShoppingSite<Source extends string = string, Reader extends string = string> {
  /** Stable id stored with every snapshot. Never rename one: saved products are keyed by it. */
  readonly source: Source;
  /**
   * Store name shown to shoppers, e.g. "Amazon". Storefronts of one store (amazon.in, amazon.com) share
   * it, so the UI lists, filters and groups them as one store.
   */
  readonly label: string;
  /** Company behind the store, for "not affiliated with …" notices, e.g. "Amazon". */
  readonly brand: string;
  /**
   * Which page reader in src/extract/site-extractors.ts reads this site, e.g. "amazon". Storefronts of
   * one store share a reader.
   */
  readonly reader: Reader;
  /** Canonical host. URLs on the bare domain (without "www.") are accepted too. */
  readonly host: string;
  /**
   * Product-page paths as Chrome match-pattern paths ("*" matches anything), e.g. "/dp/*". They drive the
   * right-click menu and the Alt+click link check; the extractor makes the exact decision.
   */
  readonly productPaths: readonly string[];
  /** What a product URL looks like, for "supported sites" lists, e.g. "/dp/… pages". */
  readonly productPagesHint: string;
  /** A real product URL on this site, shown in error messages. */
  readonly exampleUrl: string;
  /** ISO 4217 code of the store's prices, used when a displayed price has no currency symbol. */
  readonly currency: string;
  /**
   * Search page with a "{query}" placeholder. Sites that have one get a "Search <label>" row in
   * comparisons, so a product saved elsewhere can be looked up there.
   */
  readonly searchUrl?: string;
}
