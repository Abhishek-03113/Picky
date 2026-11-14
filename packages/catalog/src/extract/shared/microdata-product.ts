import { parseMoney } from "../../money/parse-money.ts";
import { findFirst, type PageNode } from "../../page/page-node.ts";
import type { Money } from "../../product-snapshot.ts";
import { textOrNull } from "../../text/normalize-text.ts";

/** What a page's schema.org microdata (`itemprop` attributes) says about its product. */
export interface MicrodataProduct {
  name: string | null;
  brand: string | null;
  sku: string | null;
  image: string | null;
  price: Money | null;
}

/**
 * Reads the product from `[itemprop]` microdata, scoped to the first `itemtype` Product when there is
 * one. A property's value is its `content`, then `src`/`href`, then its text, as the microdata spec reads it.
 *
 * @example readMicrodataProduct(page) // { name: "Kettle", brand: "Prestige", sku: "PKE1", image: "https://…", price: { amount: 1499, currency: "INR" } }
 */
export function readMicrodataProduct(page: PageNode): MicrodataProduct {
  const scope = findFirst(page, '[itemtype*="schema.org/Product"]') ?? page;
  const currency = itemValue(scope, "priceCurrency") ?? undefined;
  const priceText = itemValue(scope, "price");
  return {
    name: itemValue(scope, "name"),
    brand: brandValue(scope),
    sku: itemValue(scope, "sku"),
    image: itemValue(scope, "image"),
    price: priceText === null ? null : parseMoney(priceText, currency),
  };
}

/**
 * Value of the first `[itemprop=<name>]` under the scope that has one, or null.
 *
 * @example itemValue(scope, "sku") // "PKE1"
 */
export function itemValue(scope: PageNode, name: string): string | null {
  for (const node of scope.findAll(`[itemprop="${name}"]`)) {
    const value = textOrNull(node.attr("content") ?? node.attr("src") ?? node.attr("href") ?? node.text());
    if (value !== null) return value;
  }
  return null;
}

// Brand is text, or a nested Brand/Organization item whose own `name` holds it.
function brandValue(scope: PageNode): string | null {
  const brand = findFirst(scope, '[itemprop="brand"]');
  if (brand === null) return null;
  return textOrNull(brand.attr("content")) ?? itemValue(brand, "name") ?? textOrNull(brand.text());
}
