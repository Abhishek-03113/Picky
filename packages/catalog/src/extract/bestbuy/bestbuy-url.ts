import type { ShoppingSite } from "../../sites/shopping-site.ts";
import { siteHosts } from "../../sites/site-urls.ts";
import { parseUrlOnHosts } from "../shared/parse-site-url.ts";

// /site/<slug>/<sku>.p?skuId=<sku>, /site/<sku>.p, and the newer /product/<slug>/<code>.
const SITE_PATH = /\/(\d+)\.p\/?$/i;
const PRODUCT_PATH = /^\/product\/[^/]+\/([A-Za-z0-9]+)\/?$/;

/** Best Buy's ProductUrlRef: the id is the SKU, or the product code on /product/ pages. */
export interface BestBuyProductRef {
  productId: string;
  canonicalUrl: string;
}

/**
 * Recognises a Best Buy product-page URL; null for anything else.
 *
 * @example parseBestBuyProductUrl("https://www.bestbuy.com/site/some-tv/6535281.p?skuId=6535281&ref=x", bestbuy)
 * // { productId: "6535281", canonicalUrl: "https://www.bestbuy.com/site/6535281.p?skuId=6535281" }
 */
export function parseBestBuyProductUrl(pageUrl: string, site: ShoppingSite): BestBuyProductRef | null {
  const url = parseUrlOnHosts(pageUrl, new Set(siteHosts(site)));
  if (url === null) return null;
  const productCode = PRODUCT_PATH.exec(url.pathname)?.[1];
  if (productCode !== undefined) return { productId: productCode, canonicalUrl: `https://${site.host}${url.pathname}` };
  const sku = SITE_PATH.exec(url.pathname)?.[1] ?? skuParam(url);
  if (!url.pathname.startsWith("/site/") || sku === undefined) return null;
  return { productId: sku, canonicalUrl: `https://${site.host}/site/${sku}.p?skuId=${sku}` };
}

function skuParam(url: URL): string | undefined {
  const sku = url.searchParams.get("skuId");
  return sku !== null && /^\d+$/.test(sku) ? sku : undefined;
}
