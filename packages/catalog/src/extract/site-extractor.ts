import type { PageNode } from "../page/page-node.ts";
import type { ProductSnapshot, ProductSource } from "../product-snapshot.ts";

/**
 * How Picky reads one marketplace's product pages. Add a site by giving it an entry in
 * src/sites/shopping-sites.ts and a reader in site-extractors.ts (docs/adding-a-site.md); the API,
 * web app and extension pick it up from there.
 *
 * @example SITE_EXTRACTORS[2]?.productIdFromUrl("https://www.flipkart.com/x/p/itm1?pid=MOB1") // "MOB1"
 */
export interface SiteExtractor {
  readonly source: ProductSource;
  /** A real product URL on this site, shown in error messages and UI hints. */
  readonly exampleUrl: string;
  /** The site's product id when the URL is one of its product pages, else null. */
  productIdFromUrl(pageUrl: string): string | null;
  /** Reads a product page. Throws ProductPageError when the page is not a readable product page. */
  extract(page: PageNode, pageUrl: string, capturedAt: Date): ProductSnapshot;
}
