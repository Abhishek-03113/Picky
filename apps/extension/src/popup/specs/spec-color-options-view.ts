import { formatMoney, pluralize, type ColorOption } from "@picky/catalog";
import type { ReadColorOption } from "../../link-capture/color-page-reader.ts";
import type { Dom } from "../dom.ts";

/** What the preview knows about the chosen colour while its page may still be loading. */
type ColorState =
  | { kind: "ready"; option: ColorOption }
  | { kind: "loading"; option: ColorOption }
  | { kind: "failed"; option: ColorOption };

/**
 * The colours the product comes in, picked in place: swatches switch a preview of the chosen colour's photo,
 * price and stock, without leaving the page or opening a tab. A colour not read at save time is read on
 * demand when `readColor` is given (Quick Look, popup). Nothing when the product has one colour.
 * Mirrors the web app's ColorOptionsCard.
 *
 * @example container.append(...renderSpecColorOptionsView(dom, snapshot.colorOptions, readColor))
 */
export function renderSpecColorOptionsView(
  dom: Dom,
  options: readonly ColorOption[],
  readColor: ReadColorOption | null = null,
): HTMLElement[] {
  const first = options.find((option) => option.selected) ?? options[0];
  if (first === undefined || options.length < 2) return [];
  const preview = dom.el("div", { className: "color-preview", attrs: { "aria-live": "polite" } });
  const reads = new Map<string, Promise<ColorOption>>();
  let chosen = first.externalId;

  const show = (option: ColorOption): void => {
    chosen = option.externalId;
    swatches.forEach((swatch, index) => swatch.setAttribute("aria-pressed", String(options[index] === option)));
    if (!needsReading(option) || readColor === null) return paintPreview(dom, preview, { kind: "ready", option });
    paintPreview(dom, preview, { kind: "loading", option });
    if (!reads.has(option.externalId)) reads.set(option.externalId, readColor(option));
    reads.get(option.externalId)?.then(
      (read) => {
        if (chosen === option.externalId) paintPreview(dom, preview, { kind: "ready", option: read });
      },
      () => {
        reads.delete(option.externalId);
        if (chosen === option.externalId) paintPreview(dom, preview, { kind: "failed", option });
      },
    );
  };
  const swatches = options.map((option) => renderSwatch(dom, option, () => show(option)));
  show(first);

  const attrs = { "aria-labelledby": "color-options-title" };
  return [
    dom.el("section", { className: "spec-card color-options", attrs }, [
      dom.el("div", { className: "color-options-head" }, [
        dom.el("h2", { attrs: { id: "color-options-title" }, text: "Colours" }),
        dom.el("span", { className: "subtle", text: pluralize(options.length, "colour") }),
      ]),
      preview,
      dom.el("div", { className: "color-swatches", attrs: { role: "group", "aria-label": "Pick a colour" } }, swatches),
    ]),
  ];
}

function needsReading(option: ColorOption): boolean {
  return !option.selected && option.price === null && option.image === null;
}

function renderSwatch(dom: Dom, option: ColorOption, onPick: () => void): HTMLButtonElement {
  const attrs = { type: "button", "aria-pressed": "false", "aria-label": option.name, title: option.name };
  const swatch = dom.el("button", { className: "color-swatch", attrs });
  const picture = option.swatchImage ?? option.image;
  swatch.append(
    picture === null
      ? dom.el("span", { className: "color-swatch-name", text: option.name })
      : dom.el("img", { attrs: { src: picture, alt: "", loading: "lazy" } }),
  );
  swatch.addEventListener("click", onPick);
  return swatch;
}

function paintPreview(dom: Dom, preview: HTMLElement, state: ColorState): void {
  const { option } = state;
  const photo = dom.el("span", { className: "color-preview-photo" });
  const picture = option.image ?? option.swatchImage;
  if (picture !== null) photo.append(dom.el("img", { attrs: { src: picture, alt: option.name } }));
  const text = dom.el("span", { className: "color-preview-text" }, [
    dom.el("span", { className: "color-preview-name", text: option.name }),
    dom.el("span", { className: "color-preview-price", text: priceLabel(state) }),
  ]);
  if (state.kind === "ready" && option.availability !== null) {
    text.append(dom.el("span", { className: "color-preview-stock", text: option.availability }));
  }
  if (option.selected) text.append(dom.el("span", { className: "chip", text: "The one you’re viewing" }));
  preview.setAttribute("aria-busy", String(state.kind === "loading"));
  preview.replaceChildren(photo, text);
}

function priceLabel(state: ColorState): string {
  if (state.kind === "loading") return "Getting this colour’s details…";
  if (state.kind === "failed") return "Couldn’t get this colour’s details. Tap it again to try once more.";
  return state.option.price === null ? "Price not shown for this colour" : formatMoney(state.option.price);
}
