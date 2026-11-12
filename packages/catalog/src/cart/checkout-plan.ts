import { pluralize } from "../present/pluralize.ts";
import type { Money, ProductSource } from "../product-snapshot.ts";
import { shoppingSite } from "../sites/index.ts";
import { isUnavailable } from "./cart-item-state.ts";
import type { CartItem } from "./cart-types.ts";
import { groupCartByStore } from "./group-cart-by-store.ts";

/** Why an item is left out of checkout. An item with no listed price still opens on its store. */
export type SkippedReason = "out-of-stock";

export interface CheckoutStep {
  source: ProductSource;
  label: string;
  itemCount: number;
  subtotals: Money[];
  /** "cart-link" opens one pre-filled cart; "product-links" opens each product page. */
  kind: "cart-link" | "product-links";
  urls: string[];
}

export interface SkippedItem {
  item: CartItem;
  reason: SkippedReason;
}

export interface CheckoutPlan {
  steps: CheckoutStep[];
  skipped: SkippedItem[];
}

/**
 * Plans how to open the cart in each store: Amazon storefronts get one pre-filled cart link (no affiliate
 * tag), other stores get their product pages. Out-of-stock items are skipped; an item with no
 * listed price still opens on its store, and only its subtotal leaves it out.
 *
 * @example buildCheckoutPlan(items).steps[0].urls // ["https://www.amazon.in/gp/aws/cart/add.html?ASIN.1=B0FQG1YHYR&Quantity.1=2"]
 */
export function buildCheckoutPlan(items: readonly CartItem[]): CheckoutPlan {
  const skipped = items.flatMap(skipReason);
  const skippedItems = new Set(skipped.map((entry) => entry.item));
  const buyable = items.filter((item) => !skippedItems.has(item));
  return { steps: groupCartByStore(buyable).map(stepFor), skipped };
}

function skipReason(item: CartItem): SkippedItem[] {
  if (isUnavailable(item)) return [{ item, reason: "out-of-stock" }];
  return [];
}

function stepFor(group: ReturnType<typeof groupCartByStore>[number]): CheckoutStep {
  const site = shoppingSite(group.source);
  const base = { source: group.source, label: group.label, itemCount: group.items.length, subtotals: group.subtotals };
  if (site.reader === "amazon") return { ...base, kind: "cart-link", urls: [amazonCartUrl(site.host, group.items)] };
  return { ...base, kind: "product-links", urls: group.items.map((item) => item.product.snapshot.url) };
}

/** The "add these to my cart" link of one Amazon storefront. */
function amazonCartUrl(host: string, items: readonly CartItem[]): string {
  const lines = items.map((item, index) => {
    const n = index + 1;
    return `ASIN.${n}=${encodeURIComponent(item.product.snapshot.externalId)}&Quantity.${n}=${item.quantity}`;
  });
  return `https://${host}/gp/aws/cart/add.html?${lines.join("&")}`;
}

/**
 * One line saying what the step will open.
 *
 * @example checkoutStepSummary({ kind: "cart-link", label: "Amazon", itemCount: 2, urls: ["…"] }) // "Opens 1 tab: your Amazon cart with 2 items"
 * @example checkoutStepSummary({ kind: "product-links", label: "Flipkart", itemCount: 3, urls: ["…", "…", "…"] }) // "Opens 3 tabs, one per item"
 */
export function checkoutStepSummary(step: Pick<CheckoutStep, "kind" | "label" | "itemCount" | "urls">): string {
  if (step.kind === "cart-link") {
    return `Opens 1 tab: your ${step.label} cart with ${pluralize(step.itemCount, "item")}`;
  }
  if (step.urls.length === 1) return "Opens 1 tab: the product page";
  return `Opens ${pluralize(step.urls.length, "tab")}, one per item`;
}
