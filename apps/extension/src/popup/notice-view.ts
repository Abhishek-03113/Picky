import type { Dom } from "./dom.ts";
import type { IconName } from "./icons.ts";

export interface NoticeModel {
  icon: IconName;
  title: string;
  body: string;
}

/**
 * Shared layout of the Unsupported and Error boards: centred icon, title, body, optional
 * extra block (supported-sites list) and an actions area pinned to the bottom.
 *
 * @example renderNoticeView(dom, { icon: "noProduct", title: "No product on this page", body: "…" }, [], [link])
 */
export function renderNoticeView(
  dom: Dom,
  model: NoticeModel,
  extras: readonly HTMLElement[],
  actions: readonly HTMLElement[],
): HTMLElement {
  return dom.el("main", { className: "body body-notice" }, [
    renderMessage(dom, model),
    ...extras,
    dom.el("div", { className: "actions" }, actions),
  ]);
}

function renderMessage(dom: Dom, model: NoticeModel): HTMLElement {
  return dom.el("div", { className: "notice" }, [
    dom.el("span", { className: "notice-icon" }, [dom.icon(model.icon, "icon-lg")]),
    dom.el("h1", { className: "title-md-lg", text: model.title }),
    dom.el("p", { className: "muted", text: model.body }),
  ]);
}
