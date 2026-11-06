import { formatMoney, pluralize, type ColorOption } from "@picky/catalog";
import type { Dom } from "../dom.ts";

/**
 * The colours the product comes in, each linking to its own listing, with the price and stock read
 * from that listing's page. Nothing when the product has one colour. Mirrors the web app's ColorOptionsCard.
 *
 * @example container.append(...renderSpecColorOptionsView(dom, snapshot.colorOptions))
 */
export function renderSpecColorOptionsView(dom: Dom, options: readonly ColorOption[]): HTMLElement[] {
  if (options.length === 0) return [];
  const attrs = { "aria-labelledby": "color-options-title" };
  return [
    dom.el("section", { className: "spec-card color-options", attrs }, [
      dom.el("div", { className: "color-options-head" }, [
        dom.el("h2", { attrs: { id: "color-options-title" }, text: "Colours" }),
        dom.el("span", { className: "subtle", text: pluralize(options.length, "colour") }),
      ]),
      dom.el(
        "ul",
        { className: "color-option-list" },
        options.map((option) => renderOption(dom, option)),
      ),
    ]),
  ];
}

function renderOption(dom: Dom, option: ColorOption): HTMLElement {
  const photo = option.image ?? option.swatchImage;
  const thumb = dom.el("span", { className: "color-option-photo" });
  if (photo !== null) thumb.append(dom.el("img", { attrs: { src: photo, alt: "", loading: "lazy" } }));
  const text = dom.el("span", { className: "color-option-text" }, [
    dom.el("span", { className: "color-option-name", text: option.name }),
    dom.el("span", { className: "color-option-price", text: priceLabel(option) }),
  ]);
  if (option.availability !== null) {
    text.append(dom.el("span", { className: "color-option-stock", text: option.availability }));
  }
  if (option.selected) text.append(dom.el("span", { className: "chip", text: "This page" }));
  const attrs: Record<string, string> = { href: option.url, target: "_blank", rel: "noopener noreferrer" };
  if (option.selected) attrs["aria-current"] = "page";
  return dom.el("li", {}, [dom.el("a", { className: "color-option", attrs }, [thumb, text])]);
}

function priceLabel(option: ColorOption): string {
  return option.price === null ? "Open to see price" : formatMoney(option.price);
}
