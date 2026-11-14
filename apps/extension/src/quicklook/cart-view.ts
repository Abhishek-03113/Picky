import {
  cartTotals,
  formatCaptureTime,
  formatMoney,
  isUnavailable,
  lineTotal,
  sourceLabel,
  type CartItem,
  type CatalogCartDetail,
  type ProductSnapshot,
} from "@picky/catalog";
import { failureHint } from "../failure-hint.ts";
import { Dom } from "../popup/dom.ts";
import type { OverlayActions } from "./overlay-actions.ts";
import { pageCartQuantity, type QuickLookModel } from "./quicklook-model.ts";

const MISSING_VALUE = "—";
const MAX_QUANTITY = 99;

function notice(dom: Dom, title: string, detail: string, action: HTMLElement | null): HTMLElement {
  const children = [
    dom.el("p", { className: "notice-title", text: title }),
    dom.el("p", { className: "notice-detail", text: detail }),
  ];
  return dom.el("div", { className: "notice" }, action === null ? children : [...children, action]);
}

function thumbnail(dom: Dom, imageUrl: string | undefined, className: string): HTMLElement {
  if (imageUrl === undefined) return dom.el("span", { className: `${className} thumb-empty` });
  return dom.el("img", { className, attrs: { src: imageUrl, alt: "", referrerpolicy: "no-referrer" } });
}

function stepButton(dom: Dom, label: string, ariaLabel: string, focusId: string, onClick: () => void): HTMLElement {
  const button = dom.el("button", {
    className: "qty-step",
    text: label,
    attrs: { type: "button", "aria-label": ariaLabel, "data-focus": focusId },
  });
  button.addEventListener("click", onClick);
  return button;
}

/**
 * "Add to cart", or "In cart × n" with a + for one more, for the open page's product. Shared by the
 * Cart view's "This page" strip and the details view; `focusPrefix` keeps their focus keys apart.
 *
 * @example cartButton(dom, model, actions, "details")
 */
export function cartButton(dom: Dom, model: QuickLookModel, actions: OverlayActions, focusPrefix: string): HTMLElement {
  const quantity = pageCartQuantity(model);
  if (quantity === 0) {
    const add = dom.el(
      "button",
      { className: "add", attrs: { type: "button", "data-focus": `${focusPrefix}-cart-add` } },
      [dom.icon("plus", "icon-add"), "Add to cart"],
    );
    add.disabled = model.cartBusy;
    add.addEventListener("click", () => actions.addPageToCart());
    return add;
  }
  const more = stepButton(dom, "+", "Add one more to your cart", `${focusPrefix}-cart-more`, () =>
    actions.addPageToCart(),
  );
  more.toggleAttribute("disabled", model.cartBusy || quantity >= MAX_QUANTITY);
  return dom.el("span", { className: "in-cart" }, [
    dom.el("span", { className: "in-cart-text", text: `In cart × ${quantity}` }),
    more,
  ]);
}

/** The open product above the cart, so "is this in my cart?" is answered at a glance. */
function thisPageStrip(dom: Dom, page: ProductSnapshot, model: QuickLookModel, actions: OverlayActions): HTMLElement {
  return dom.el("div", { className: "cart-page", attrs: { "aria-label": "This page" } }, [
    dom.el("span", { className: "page-pill", text: "This page" }),
    thumbnail(dom, page.images[0], "cart-thumb"),
    dom.el("p", { className: "cart-title", text: page.title, attrs: { title: page.title } }),
    cartButton(dom, model, actions, "page"),
  ]);
}

function quantityControl(dom: Dom, item: CartItem, busy: boolean, actions: OverlayActions): HTMLElement {
  const { id, snapshot } = item.product;
  const fewer = stepButton(dom, "−", `One fewer ${snapshot.title}`, `qty-down-${id}`, () =>
    actions.setCartQuantity(id, item.quantity - 1),
  );
  const more = stepButton(dom, "+", `One more ${snapshot.title}`, `qty-up-${id}`, () =>
    actions.setCartQuantity(id, item.quantity + 1),
  );
  fewer.toggleAttribute("disabled", busy);
  more.toggleAttribute("disabled", busy || item.quantity >= MAX_QUANTITY);
  return dom.el("span", { className: "qty" }, [
    fewer,
    dom.el("span", { className: "qty-value", text: `× ${item.quantity}`, attrs: { "aria-live": "polite" } }),
    more,
  ]);
}

function linePrice(dom: Dom, item: CartItem): HTMLElement {
  if (isUnavailable(item)) return dom.el("span", { className: "cart-price cart-price-none", text: "Out of stock" });
  const total = lineTotal(item);
  const priceAsOf = `Price as of ${formatCaptureTime(item.product.snapshot.capturedAt)}`;
  return dom.el("span", {
    className: total === null ? "cart-price cart-price-none" : "cart-price",
    text: total === null ? MISSING_VALUE : formatMoney(total),
    attrs: { title: total === null ? "Price not listed" : priceAsOf },
  });
}

function cartRow(dom: Dom, item: CartItem, busy: boolean, actions: OverlayActions): HTMLElement {
  const { snapshot } = item.product;
  const title = dom.el("a", {
    className: "cart-title",
    text: snapshot.title,
    attrs: { href: snapshot.url, target: "_blank", rel: "noopener", title: snapshot.title },
  });
  return dom.el("li", { className: "cart-row" }, [
    thumbnail(dom, snapshot.images[0], "cart-thumb"),
    dom.el("span", { className: "cart-info" }, [
      title,
      dom.el("span", { className: "cart-store", text: sourceLabel(snapshot.source) }),
    ]),
    quantityControl(dom, item, busy, actions),
    linePrice(dom, item),
  ]);
}

function totalsNote(unpricedCount: number, unavailableCount: number): string | null {
  const parts = [
    unpricedCount > 0 ? `${unpricedCount} with no listed price` : "",
    unavailableCount > 0 ? `${unavailableCount} out of stock` : "",
  ].filter(Boolean);
  return parts.length === 0 ? null : `Not counted: ${parts.join(", ")}.`;
}

/** "In stock, by currency": one total per currency, never converted or added together. */
function totalsBlock(dom: Dom, cart: CatalogCartDetail): HTMLElement {
  const { totals, unpricedCount, unavailableCount } = cartTotals(cart.items);
  const lines = totals.map((total) =>
    dom.el("p", { className: "cart-total" }, [
      dom.el("span", { text: total.currency }),
      dom.el("span", { className: "cart-total-amount", text: formatMoney(total) }),
    ]),
  );
  const note = totalsNote(unpricedCount, unavailableCount);
  return dom.el("div", { className: "cart-totals" }, [
    dom.el("p", { className: "cart-totals-title", text: "In stock, by currency" }),
    ...(lines.length === 0 ? [dom.el("p", { className: "cart-total", text: MISSING_VALUE })] : lines),
    ...(note === null ? [] : [dom.el("p", { className: "cart-totals-note", text: note })]),
  ]);
}

function webLink(dom: Dom, text: string, href: string, className: string, focusId: string): HTMLElement {
  return dom.el("a", {
    className,
    text,
    attrs: { href, target: "_blank", rel: "noopener", "data-focus": focusId },
  });
}

/** "Share" and "Checkout" open the cart in the web app, in a new tab: the panel sits on the shop's page. */
function cartLinks(dom: Dom, cart: CatalogCartDetail, webBaseUrl: string): HTMLElement {
  const cartUrl = `${webBaseUrl}/carts/${encodeURIComponent(cart.id)}`;
  return dom.el("div", { className: "cart-links" }, [
    webLink(dom, "Share ↗", cartUrl, "open-link", "cart-share"),
    webLink(dom, "Checkout ↗", `${cartUrl}/checkout`, "add", "cart-checkout"),
  ]);
}

function signedOutCart(dom: Dom, webBaseUrl: string): HTMLElement {
  const link = webLink(dom, "Sign in to Picky", `${webBaseUrl}/login`, "add add-wide", "sign-in");
  return notice(
    dom,
    "Sign in to use your cart",
    "Sign in to keep a cart of what you plan to buy, across stores.",
    link,
  );
}

function cartStatusView(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement | null {
  if (model.cartStatus === "idle" || model.cartStatus === "loading")
    return dom.el("div", { className: "notice", attrs: { role: "status" } }, [
      dom.icon("spinner", "icon-spin"),
      "Loading your cart…",
    ]);
  if (model.cartStatus === "failed") {
    const retry = dom.el("button", {
      className: "add add-wide",
      text: "Try again",
      attrs: { type: "button", "data-focus": "cart-retry" },
    });
    retry.addEventListener("click", () => actions.retryCart());
    return notice(dom, "Couldn't open your cart", failureHint(model.cartMessage ?? "unknown error"), retry);
  }
  return null;
}

/**
 * The Cart view: a "This page" strip for the open product, compact rows (photo, title, store, quantity
 * with − / +, line price), totals per currency, and Share / Checkout links into the web app.
 *
 * @example cartView(dom, model, actions)
 */
export function cartView(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement {
  const status = cartStatusView(dom, model, actions);
  if (status !== null) return status;
  const state = model.cart;
  if (state?.signedIn === false) return signedOutCart(dom, state.webBaseUrl);
  const page = model.pageSnapshot;
  const strip = page === null ? [] : [thisPageStrip(dom, page, model, actions)];
  const cart = state?.cart ?? null;
  if (state === null || cart === null || cart.items.length === 0) {
    const empty = notice(dom, "Your cart is empty", "Add products from any store page and see them here.", null);
    return dom.el("div", { className: "cart" }, [...strip, empty]);
  }
  const rows = cart.items.map((item) => cartRow(dom, item, model.cartBusy, actions));
  return dom.el("div", { className: "cart" }, [
    ...strip,
    dom.el("ul", { className: "cart-rows", attrs: { "aria-label": cart.name } }, rows),
    dom.el("div", { className: "cart-foot" }, [totalsBlock(dom, cart), cartLinks(dom, cart, state.webBaseUrl)]),
  ]);
}
