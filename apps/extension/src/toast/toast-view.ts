import { failureHint } from "../failure-hint.ts";
import type { PermissionRetry } from "../permissions/store-access-service.ts";
import { Dom } from "../popup/dom.ts";
import { addedDetail, cartAddedDetail, type ToastMessage } from "./toast-message.ts";

export interface ToastActions {
  openQuickLook(): void;
  undo(comparisonId: string, productId: string): void;
  openCart(): void;
  undoCart(undo: Extract<ToastMessage, { kind: "cart-added" }>["undo"]): void;
  dismiss(): void;
  /** "Allow Picky on <Store>": the click is the user gesture Chrome's permission prompt needs. */
  allowStore(source: string, retry: PermissionRetry | null): void;
  /** "Not now": Picky does not ask on this store again. */
  declineStore(source: string): void;
}

function lines(dom: Dom, title: string, detail: string, extra: readonly Node[] = []): HTMLElement {
  return dom.el("div", { className: "toast-text" }, [
    dom.el("p", { className: "toast-title", text: title }),
    dom.el("p", { className: "toast-detail", text: detail }),
    ...extra,
  ]);
}

function linkButton(dom: Dom, label: string, onClick: () => void): HTMLElement {
  const button = dom.el("button", { className: "toast-action", text: label, attrs: { type: "button" } });
  button.addEventListener("click", onClick);
  return button;
}

const BADGE_ICONS = { spin: "spinner", ok: "check", fail: "alert", ask: "library" } as const;

function badge(dom: Dom, kind: keyof typeof BADGE_ICONS): HTMLElement {
  const icon = BADGE_ICONS[kind];
  return dom.el("span", { className: `toast-badge toast-badge-${kind}`, attrs: { "aria-hidden": "true" } }, [
    dom.icon(icon, "toast-icon"),
  ]);
}

function addedToast(dom: Dom, message: Extract<ToastMessage, { kind: "added" }>, actions: ToastActions): HTMLElement[] {
  const { undo } = message;
  const buttons = [linkButton(dom, "See details", () => actions.openQuickLook())];
  if (undo !== null) buttons.push(linkButton(dom, "Undo", () => actions.undo(undo.comparisonId, undo.productId)));
  const row = dom.el("div", { className: "toast-actions" }, buttons);
  return [badge(dom, "ok"), lines(dom, `Saved ${message.title}`, addedDetail(message), [row])];
}

function cartAddedToast(
  dom: Dom,
  message: Extract<ToastMessage, { kind: "cart-added" }>,
  actions: ToastActions,
): HTMLElement[] {
  const row = dom.el("div", { className: "toast-actions" }, [
    linkButton(dom, "Open cart", () => actions.openCart()),
    linkButton(dom, "Undo", () => actions.undoCart(message.undo)),
  ]);
  return [badge(dom, "ok"), lines(dom, `Added to ${message.cartName}`, cartAddedDetail(message), [row])];
}

function permissionToast(
  dom: Dom,
  message: Extract<ToastMessage, { kind: "permission" }>,
  actions: ToastActions,
): HTMLElement[] {
  const row = dom.el("div", { className: "toast-actions" }, [
    linkButton(dom, `Allow Picky on ${message.storeLabel}`, () => actions.allowStore(message.source, message.retry)),
    linkButton(dom, "Not now", () => actions.declineStore(message.source)),
  ]);
  const detail = `To read ${message.storeLabel} links, Picky needs your OK once. It reads only product pages.`;
  return [badge(dom, "ask"), lines(dom, `Use Picky on ${message.storeLabel}?`, detail, [row])];
}

/**
 * One toast card for a message: spinner while reading, a check with See details / Undo when saved (or
 * Open cart / Undo when added to a cart), an alert with the reason when failed, Allow / Not now when a
 * beta store needs access first.
 *
 * @example stack.append(toastView(dom, message, actions))
 */
export function toastView(dom: Dom, message: ToastMessage, actions: ToastActions): HTMLElement {
  const content = toastContent(dom, message, actions);
  const card = dom.el("div", { className: "toast", attrs: { "data-toast-id": message.id } }, content);
  if (message.kind === "failed") card.append(linkButton(dom, "Dismiss", () => actions.dismiss()));
  return card;
}

function toastContent(dom: Dom, message: ToastMessage, actions: ToastActions): Node[] {
  if (message.kind === "added") return addedToast(dom, message, actions);
  if (message.kind === "cart-added") return cartAddedToast(dom, message, actions);
  if (message.kind === "permission") return permissionToast(dom, message, actions);
  if (message.kind === "failed")
    return [badge(dom, "fail"), lines(dom, "Couldn't save that product", failureHint(message.reason))];
  return [badge(dom, "spin"), lines(dom, `Saving ${message.title}…`, `To ${message.destination}. Keep browsing.`)];
}
