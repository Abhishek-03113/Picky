import { SHOPPING_SITES } from "@picky/catalog/sites";
import type { Dom } from "./dom.ts";
import { renderNoticeView } from "./notice-view.ts";

/**
 * "No product on this page" board with the supported sites and a library link.
 *
 * @example renderUnsupportedView(dom, "http://localhost:5173")
 */
export function renderUnsupportedView(dom: Dom, webBaseUrl: string): HTMLElement {
  const model = {
    icon: "noProduct",
    title: "No product on this page",
    body: "Open a single product on one of these sites, then click Picky again.",
  } as const;
  return renderNoticeView(dom, model, [renderSupportedSites(dom)], [renderLibraryButton(dom, webBaseUrl)]);
}

export function renderLibraryButton(dom: Dom, webBaseUrl: string): HTMLElement {
  const attrs = { href: `${webBaseUrl}/`, target: "_blank", rel: "noopener" };
  return dom.el("a", { className: "button button-secondary", attrs, text: "See saved products" });
}

function renderSupportedSites(dom: Dom): HTMLElement {
  const rows = SHOPPING_SITES.map((site) =>
    dom.el("li", { className: "site-row" }, [
      dom.icon("check", "icon-xs icon-done"),
      dom.el("span", { className: "site-name", text: site.label }),
      dom.el("span", { className: "muted-sm site-pages", text: site.productPagesHint }),
    ]),
  );
  return dom.el("ul", { className: "sites" }, rows);
}
