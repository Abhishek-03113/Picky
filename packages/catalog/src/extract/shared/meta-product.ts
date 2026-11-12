import { parseMoney } from "../../money/parse-money.ts";
import { firstAttr, type PageNode } from "../../page/page-node.ts";
import type { Money } from "../../product-snapshot.ts";
import { textOrNull } from "../../text/normalize-text.ts";

/** What a page's Open Graph, product and Twitter meta tags say about its product. */
export interface MetaProduct {
  name: string | null;
  image: string | null;
  price: Money | null;
  canonicalUrl: string | null;
}

/**
 * Reads the product from `<head>` meta tags: og:title, og:image, product:price:amount with
 * product:price:currency (or their og:price twins), else the "₹1,299" style twitter:data1 label, and
 * link[rel=canonical]. Nearly every store fills these for link previews.
 *
 * @example readMetaProduct(page) // { name: "Boat Airdopes 141", image: "https://…", price: { amount: 1299, currency: "INR" }, canonicalUrl: "https://…" }
 */
export function readMetaProduct(page: PageNode): MetaProduct {
  return {
    name: metaContent(page, "og:title"),
    image: metaContent(page, "og:image:secure_url") ?? metaContent(page, "og:image"),
    price: metaPrice(page),
    canonicalUrl: textOrNull(firstAttr(page, 'link[rel="canonical"]', "href")),
  };
}

/**
 * Content of the first meta tag with this `property` or `name`, or null when absent or blank.
 *
 * @example metaContent(page, "og:title") // "Boat Airdopes 141"
 */
export function metaContent(page: PageNode, key: string): string | null {
  return (
    textOrNull(firstAttr(page, `meta[property="${key}"]`, "content")) ??
    textOrNull(firstAttr(page, `meta[name="${key}"]`, "content"))
  );
}

function metaPrice(page: PageNode): Money | null {
  const amount = metaContent(page, "product:price:amount") ?? metaContent(page, "og:price:amount");
  const currency = metaContent(page, "product:price:currency") ?? metaContent(page, "og:price:currency") ?? undefined;
  const tagged = amount === null ? null : parseMoney(amount, currency);
  if (tagged !== null) return tagged;
  const label = metaContent(page, "twitter:data1");
  return label === null ? null : parseMoney(label, currency);
}
