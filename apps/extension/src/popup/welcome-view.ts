import { QUICK_LOOK_SHORTCUT, shortcutKeyLabels, type OperatingSystem } from "@picky/catalog";
import type { Dom } from "./dom.ts";

export interface WelcomeHandlers {
  onDismiss: () => void;
}

const STEPS = [
  { title: "Pin Picky", body: "Click the puzzle icon in Chrome's toolbar, then the pin next to Picky." },
  { title: "Open any product page", body: "On Amazon.in or Flipkart, click Picky. That's it." },
] as const;

/**
 * First-run body: two setup steps, the shortcut (labelled for `os`) and a "Got it" button.
 *
 * @example renderWelcomeView(dom, { onDismiss: () => void controller.dismissWelcome() }, "mac")
 */
export function renderWelcomeView(dom: Dom, handlers: WelcomeHandlers, os: OperatingSystem): HTMLElement {
  const gotIt = dom.el("button", { className: "button button-primary", attrs: { type: "button" }, text: "Got it" });
  gotIt.addEventListener("click", handlers.onDismiss);
  return dom.el("main", { className: "body body-welcome" }, [
    renderIntro(dom),
    dom.el(
      "ol",
      { className: "steps" },
      STEPS.map((step, index) => renderStep(dom, index + 1, step)),
    ),
    renderShortcut(dom, os),
    dom.el("div", { className: "actions" }, [gotIt]),
  ]);
}

function renderIntro(dom: Dom): HTMLElement {
  return dom.el("div", { className: "intro" }, [
    dom.el("h1", { className: "title-lg", text: "You're all set" }),
    dom.el("p", { className: "muted", text: "Two quick things and you'll never dig for specs again." }),
  ]);
}

function renderStep(dom: Dom, position: number, step: (typeof STEPS)[number]): HTMLElement {
  return dom.el("li", { className: "step" }, [
    dom.el("span", { className: "step-number", text: String(position) }),
    dom.el("span", { className: "step-copy" }, [
      dom.el("span", { className: "step-title", text: step.title }),
      dom.el("span", { className: "step-body", text: step.body }),
    ]),
  ]);
}

function renderShortcut(dom: Dom, os: OperatingSystem): HTMLElement {
  const keys = shortcutKeyLabels(QUICK_LOOK_SHORTCUT, os).map((key) => dom.el("kbd", { className: "key", text: key }));
  return dom.el("div", { className: "shortcut" }, [
    dom.el("span", { text: "Shortcut" }),
    dom.el("span", { className: "keys" }, keys),
  ]);
}
