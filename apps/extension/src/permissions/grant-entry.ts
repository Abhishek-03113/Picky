import { Dom } from "../popup/dom.ts";
import { storeSiteForSource } from "./store-sites.ts";
import { ChromeStorePermissions } from "./store-permissions.ts";

// grant.html?source=walmart.com: a one-button extension page the toast's "Allow Picky on <Store>" opens when
// Chrome will not prompt from the service worker. The button click is a real user gesture on an extension
// page, so chrome.permissions.request shows Chrome's prompt here. The worker's permissions.onAdded listener
// registers the store scripts and clears any earlier "Not now".
const dom = new Dom(document);
const root = document.getElementById("root");
const site = storeSiteForSource(new URLSearchParams(location.search).get("source") ?? "");

function render(children: readonly Node[]): void {
  root?.replaceChildren(dom.el("main", { className: "grant" }, children));
}

function button(label: string, primary: boolean, onClick: () => void): HTMLButtonElement {
  const node = dom.el("button", {
    className: primary ? "grant-button grant-primary" : "grant-button",
    text: label,
    attrs: { type: "button" },
  });
  node.addEventListener("click", onClick);
  return node;
}

function showDone(granted: boolean, label: string): void {
  render([
    dom.el("h1", { text: granted ? `Picky is on ${label}` : `Picky stays off ${label}` }),
    dom.el("p", {
      text: granted
        ? `Go back to ${label} and try again. Save to Picky now shows on its product pages.`
        : `You can allow it later from the extension's site access settings.`,
    }),
    button("Close", true, () => window.close()),
  ]);
}

if (site === null) {
  render([dom.el("h1", { text: "This store is not one Picky reads" }), button("Close", true, () => window.close())]);
} else {
  const { label, source } = site;
  render([
    dom.el("h1", { text: `Allow Picky on ${label}` }),
    dom.el("p", {
      text: `Picky reads ${label} product pages you save or Alt+click, to show every detail on one clean page. It reads nothing else.`,
    }),
    dom.el("div", { className: "grant-actions" }, [
      button("Not now", false, () => window.close()),
      button(`Allow Picky on ${label}`, true, () => {
        void new ChromeStorePermissions().request(source).then((granted) => showDone(granted, label));
      }),
    ]),
  ]);
}
