import { Dom } from "../popup/dom.ts";
import type { OverlayActions } from "./overlay-actions.ts";
import {
  effectiveView,
  showsSpecs,
  thisPageColumn,
  type QuickLookModel,
  type QuickLookView,
} from "./quicklook-model.ts";

function comparisonPicker(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement {
  const state = model.state;
  const select = dom.el("select", {
    className: "picker",
    attrs: { "aria-label": "Comparison", "data-focus": "picker" },
  });
  for (const comparison of state?.comparisons ?? []) {
    const option = dom.el("option", { text: comparison.name, attrs: { value: comparison.id } });
    option.selected = comparison.id === state?.selectedId;
    select.append(option);
  }
  select.disabled = model.busy;
  select.addEventListener("change", () => actions.select(select.value));
  return dom.el("span", { className: "picker-wrap" }, [select, dom.icon("chevronDown", "icon-picker")]);
}

function segmentButton(dom: Dom, focusKey: string, label: string, checked: boolean, onPick: () => void): HTMLElement {
  const button = dom.el("button", {
    className: "segment",
    text: label,
    attrs: { type: "button", role: "radio", "aria-checked": String(checked), "data-focus": `${focusKey}-${label}` },
  });
  button.addEventListener("click", onPick);
  return button;
}

/**
 * Top-level Details | Compare | Cart switch; Details only on a product page. Its data-focus keys survive
 * the re-render a switch causes, so keyboard focus stays on the segment that was just activated.
 */
function viewControl(dom: Dom, view: QuickLookView, hasPage: boolean, actions: OverlayActions): HTMLElement {
  const attrs = { role: "radiogroup", "aria-label": "View" };
  const details = hasPage
    ? [segmentButton(dom, "view", "Details", view === "specs", () => actions.setView("specs"))]
    : [];
  const segments = [
    ...details,
    segmentButton(dom, "view", "Compare", view === "compare", () => actions.setView("compare")),
    segmentButton(dom, "view", "Cart", view === "cart", () => actions.setView("cart")),
  ];
  const control = dom.el("div", { className: "segmented segmented-view", attrs }, segments);
  control.style.setProperty("--segments", String(segments.length));
  return control;
}

function cartPicker(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement {
  const cart = model.cart;
  const select = dom.el("select", {
    className: "picker",
    attrs: { "aria-label": "Cart", "data-focus": "cart-picker" },
  });
  for (const summary of cart?.carts ?? []) {
    const option = dom.el("option", { text: summary.name, attrs: { value: summary.id } });
    option.selected = summary.id === cart?.selectedId;
    select.append(option);
  }
  select.disabled = model.cartBusy;
  select.addEventListener("change", () => actions.selectCart(select.value));
  return dom.el("span", { className: "picker-wrap" }, [select, dom.icon("chevronDown", "icon-picker")]);
}

function cartSubtitle(model: QuickLookModel): string {
  const count = model.cart?.cart?.items.length ?? 0;
  return count === 1 ? "1 item" : `${count} items`;
}

function cartControls(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement[] {
  if ((model.cart?.carts.length ?? 0) === 0)
    return [dom.el("h2", { className: "title", text: "Cart" }), dom.el("span", { className: "grow" })];
  return [
    cartPicker(dom, model, actions),
    dom.el("span", { className: "subtitle", text: cartSubtitle(model) }),
    dom.el("span", { className: "grow" }),
  ];
}

function viewControls(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement[] {
  if (showsSpecs(model)) return [dom.el("span", { className: "grow" })];
  return effectiveView(model) === "cart" ? cartControls(dom, model, actions) : comparisonControls(dom, model, actions);
}

function subtitle(model: QuickLookModel): string {
  const saved = model.state?.products.length ?? 0;
  return thisPageColumn(model) === null ? `${saved} saved` : `${saved} saved, plus the one you're viewing`;
}

function comparisonControls(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement[] {
  const hasComparisons = (model.state?.comparisons.length ?? 0) > 0;
  if (!hasComparisons)
    return [dom.el("h2", { className: "title", text: "Picky" }), dom.el("span", { className: "grow" })];
  return [
    comparisonPicker(dom, model, actions),
    dom.el("span", { className: "subtitle", text: subtitle(model) }),
    dom.el("span", { className: "grow" }),
  ];
}

/**
 * Dialog header: the Details | Compare | Cart switch (Details only on a product page), then the comparison
 * picker and saved-count line, the cart picker and item count, or, in the specs view, just a spacer;
 * the close button always ends it. With no comparisons (or carts) yet a title stands in for the picker.
 *
 * @example headerView(dom, model, actions)
 */
export function headerView(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement {
  const close = dom.el(
    "button",
    { className: "close", attrs: { type: "button", "aria-label": "Close Picky", "data-focus": "close" } },
    [dom.icon("close", "icon-close")],
  );
  close.addEventListener("click", () => actions.close());
  const switcher = viewControl(dom, effectiveView(model), model.pageSnapshot !== null, actions);
  return dom.el("header", { className: "header" }, [switcher, ...viewControls(dom, model, actions), close]);
}
