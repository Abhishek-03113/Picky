import type { OperatingSystem, ProductSnapshot } from "@picky/catalog";
import { Dom } from "../popup/dom.ts";
import { cartButton, cartView } from "./cart-view.ts";
import { footerView } from "./footer-view.ts";
import { headerView } from "./header-view.ts";
import { matrixView } from "./matrix-view.ts";
import { emptyComparisonView, emptyView, failedView, loadingView, signedOutView } from "./notice-view.ts";
import type { OverlayActions } from "./overlay-actions.ts";
import { renderSpecSheetContent } from "../popup/specs/spec-sheet-view.ts";
import { effectiveView, selectedCartName, showsSpecs, thisPageColumn, type QuickLookModel } from "./quicklook-model.ts";
import { failureHint } from "../failure-hint.ts";

/** The details view: "Add to cart" for this page above its spec sheet. */
function detailsContent(dom: Dom, page: ProductSnapshot, model: QuickLookModel, actions: OverlayActions): HTMLElement {
  return dom.el("div", { className: "details" }, [
    dom.el("div", { className: "details-actions" }, [cartButton(dom, model, actions, "details")]),
    renderSpecSheetContent(dom, page, actions.readColor),
  ]);
}

function bodyContent(dom: Dom, model: QuickLookModel, actions: OverlayActions): HTMLElement {
  // The page snapshot is already in the model, so specs render without waiting for the comparison API.
  if (model.pageSnapshot !== null && showsSpecs(model)) return detailsContent(dom, model.pageSnapshot, model, actions);
  // The cart loads on its own, so it never waits for the comparisons either.
  if (effectiveView(model) === "cart") return cartView(dom, model, actions);
  if (model.status === "loading") return loadingView(dom);
  if (model.status === "failed") return failedView(dom, model.message ?? "unknown error", actions);
  const state = model.state;
  if (state?.signedIn === false) return signedOutView(dom, state.webBaseUrl);
  if (state === null || state.comparisons.length === 0) return emptyView(dom, model, actions);
  const hasProducts = state.products.length > 0 || thisPageColumn(model) !== null;
  return hasProducts ? matrixView(dom, model, actions) : emptyComparisonView(dom);
}

function errorBanner(dom: Dom, model: QuickLookModel): HTMLElement[] {
  // Specs show only cart failures ("Add to cart" is their one action); the cart's own screen shows a first-load failure.
  const forCompare = effectiveView(model) === "compare";
  const status = forCompare ? model.status : model.cartStatus;
  const message = forCompare ? model.message : model.cartMessage;
  if (status !== "ready" || message === null) return [];
  return [dom.el("p", { className: "banner", text: failureHint(message), attrs: { role: "alert" } })];
}

function dialogLabel(model: QuickLookModel): string {
  if (effectiveView(model) === "cart") return selectedCartName(model) ?? "cart";
  const state = model.state;
  return state?.comparisons.find((comparison) => comparison.id === state.selectedId)?.name ?? "comparison";
}

/**
 * The whole Quick Look dialog (backdrop + card) for a model. Pure: same model, same DOM.
 *
 * `entering` adds the open animation. Every model change re-renders the whole dialog, so animating on each
 * render made the card flash twice per "Add" click (busy, then result); only the first render may animate.
 * `os` labels the keyboard hints.
 *
 * @example container.replaceChildren(overlayView(dom, model, actions, { entering: true, os: "mac" }))
 */
export function overlayView(
  dom: Dom,
  model: QuickLookModel,
  actions: OverlayActions,
  { entering, os }: { entering: boolean; os: OperatingSystem },
): HTMLElement {
  const label = dialogLabel(model);
  const backdrop = dom.el("div", { className: "backdrop", attrs: { "aria-hidden": "true" } });
  backdrop.addEventListener("click", () => actions.close());
  const body = dom.el("div", { className: "body" }, [...errorBanner(dom, model), bodyContent(dom, model, actions)]);
  // tabindex -1 + data-focus: the card takes initial focus, so Return reaches "add this page"
  // instead of activating whichever button would otherwise be focused first.
  const cardAttrs = { role: "dialog", "aria-modal": "true", "aria-label": `Picky: ${label}`, tabindex: "-1" };
  const card = dom.el("section", { className: "card", attrs: { ...cardAttrs, "data-focus": "dialog" } }, [
    headerView(dom, model, actions),
    body,
    footerView(dom, model, os),
  ]);
  return dom.el("div", { className: entering ? "layer entering" : "layer" }, [backdrop, card]);
}
