import { shoppingStores, siteDomain, type ShoppingStore } from "@picky/catalog/sites";
import type { Dom } from "./dom.ts";
import { renderNoticeView } from "./notice-view.ts";

/**
 * "No product on this page" board with the supported stores and a library link.
 *
 * @example renderUnsupportedView(dom, "http://localhost:5173")
 */
export function renderUnsupportedView(dom: Dom, webBaseUrl: string): HTMLElement {
  const model = {
    icon: "noProduct",
    title: "No product on this page",
    body: "Open one product on one of these stores, then click Picky again.",
  } as const;
  return renderNoticeView(dom, model, [renderSupportedSites(dom)], [renderLibraryButton(dom, webBaseUrl)]);
}

export function renderLibraryButton(dom: Dom, webBaseUrl: string): HTMLElement {
  const attrs = { href: `${webBaseUrl}/`, target: "_blank", rel: "noopener" };
  return dom.el("a", { className: "button button-secondary", attrs, text: "See saved products" });
}

function renderSupportedSites(dom: Dom): HTMLElement {
  const rows = shoppingStores().map((store) =>
    dom.el("li", { className: "site-row" }, [
      dom.icon("check", "icon-xs icon-done"),
      dom.el("span", { className: "site-name", text: store.name }),
      dom.el("span", { className: "muted-sm site-pages", text: storeWhere(store) }),
    ]),
  );
  return dom.el("ul", { className: "sites" }, rows);
}

// Where to find products: "/p/… pages", or the domains first when the store has several storefronts.
function storeWhere(store: ShoppingStore): string {
  const hint = store.sites[0]?.productPagesHint ?? "";
  return store.sites.length === 1 ? hint : `${store.sites.map(siteDomain).join(", ")} · ${hint}`;
}
