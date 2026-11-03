import { COMPARE_SHORTCUT, QUICK_LOOK_SHORTCUT, shortcutKeyLabels, type OperatingSystem } from "@picky/catalog";
import { Dom } from "../popup/dom.ts";
import { showsSpecs, type QuickLookModel } from "./quicklook-model.ts";

/** One hint: a key cap per key, then what it does. */
function hint(dom: Dom, keys: readonly string[], text: string): HTMLElement {
  return dom.el("span", { className: "hint" }, [
    ...keys.flatMap((key) => [dom.el("kbd", { className: "kbd", text: key }), " "]),
    text,
  ]);
}

/**
 * Footer: keyboard hints and the "Open in Picky" link to the web compare page. The specs view is a
 * read-only look at this page, so it keeps only the Esc hint and the shortcut to the comparison: Return,
 * the arrows and the comparison link all act on the comparison, which that view does not show. The
 * compare view ends its hints with the shortcut back to specs. Keys are labelled for `os` (⌥ ⇧ on a Mac).
 *
 * @example footerView(dom, model, "mac") // link: http://localhost:5173/comparisons/<id>
 */
export function footerView(dom: Dom, model: QuickLookModel, os: OperatingSystem): HTMLElement {
  if (showsSpecs(model))
    return dom.el("footer", { className: "footer" }, [
      hint(dom, ["Esc"], "close"),
      hint(dom, shortcutKeyLabels(COMPARE_SHORTCUT, os), "compare"),
    ]);
  const state = model.state;
  const hints = [
    hint(dom, ["Esc"], "close"),
    hint(dom, shortcutKeyLabels(["Enter"], os), "add this page"),
    hint(dom, ["←", "→"], "switch comparison"),
    hint(dom, shortcutKeyLabels(QUICK_LOOK_SHORTCUT, os), "specs"),
  ];
  if (state?.selectedId === null || state === null) return dom.el("footer", { className: "footer" }, hints);
  const href = `${state.webBaseUrl}/comparisons/${encodeURIComponent(state.selectedId)}`;
  const link = dom.el("a", {
    className: "open-link",
    text: "Open in Picky ↗",
    attrs: { href, target: "_blank", rel: "noopener" },
  });
  return dom.el("footer", { className: "footer" }, [...hints, link]);
}
