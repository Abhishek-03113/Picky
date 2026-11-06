import { describe, expect, test } from "bun:test";
import type { ColorOption, SizeChart } from "@picky/catalog";
import { renderSpecSheetView } from "../../src/popup/specs/spec-sheet-view.ts";
import { buildSpecSnapshot } from "../support/build-spec-snapshot.ts";
import { createTestDom } from "./support.ts";

const POLO_CHART: SizeChart = {
  kind: "table",
  title: "IN Regular",
  columns: ["Brand Size", "Chest (in)"],
  rows: [
    ["S", "36.5"],
    ["M", "38.5"],
  ],
};

const COLORS: ColorOption[] = [
  {
    name: "White",
    externalId: "B1",
    url: "https://www.amazon.in/dp/B1",
    swatchImage: "https://img.test/w-swatch.jpg",
    selected: true,
    price: { amount: 582, currency: "INR" },
    availability: "In stock",
    image: "https://img.test/w.jpg",
  },
  {
    name: "Blue",
    externalId: "B2",
    url: "https://www.amazon.in/dp/B2",
    swatchImage: "https://img.test/b-swatch.jpg",
    selected: false,
    price: null,
    availability: null,
    image: null,
  },
];

function mount(sizeCharts: SizeChart[], colorOptions: ColorOption[] = []): HTMLElement {
  const { dom, root } = createTestDom();
  const view = renderSpecSheetView(dom, buildSpecSnapshot({ sizeCharts, colorOptions }));
  root.append(view);
  return view;
}

const cellTexts = (view: HTMLElement, selector: string): string[] =>
  [...view.querySelectorAll(selector)].map((node) => node.textContent ?? "");

describe("size chart card", () => {
  test("shows the chart in its own unit, and the switch converts it to cm and back", () => {
    const view = mount([POLO_CHART]);
    expect(view.querySelector(".size-chart figcaption")?.textContent).toBe("IN Regular");
    expect(cellTexts(view, ".size-chart thead th")).toEqual(["Brand Size", "Chest (in)"]);
    expect(cellTexts(view, ".size-chart tbody td")).toEqual(["36.5", "38.5"]);
    const [inches, centimetres] = view.querySelectorAll<HTMLButtonElement>(".unit-switch button");
    expect(inches?.getAttribute("aria-pressed")).toBe("true");

    centimetres?.click();
    expect(cellTexts(view, ".size-chart thead th")).toEqual(["Brand Size", "Chest (cm)"]);
    expect(cellTexts(view, ".size-chart tbody td")).toEqual(["92.7", "97.8"]);
    expect(centimetres?.getAttribute("aria-pressed")).toBe("true");

    inches?.click();
    expect(cellTexts(view, ".size-chart tbody td")).toEqual(["36.5", "38.5"]);
  });

  test("shows an uploaded chart image, with no unit switch when nothing converts", () => {
    const view = mount([{ kind: "image", title: null, imageUrl: "https://img.test/chart.jpg" }]);
    expect(view.querySelector(".size-chart-image img")?.getAttribute("src")).toBe("https://img.test/chart.jpg");
    expect(view.querySelector(".unit-switch")).toBeNull();
  });

  test("is absent when the page had no chart", () => {
    expect(mount([]).querySelector(".size-charts")).toBeNull();
  });
});

describe("colours card", () => {
  test("lists each colour linking to its listing, with read price or a prompt", () => {
    const view = mount([], COLORS);
    const links = [...view.querySelectorAll<HTMLAnchorElement>(".color-option")];
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://www.amazon.in/dp/B1",
      "https://www.amazon.in/dp/B2",
    ]);
    expect(cellTexts(view, ".color-option-name")).toEqual(["White", "Blue"]);
    expect(cellTexts(view, ".color-option-price")).toEqual(["₹582", "Open to see price"]);
    expect(links[0]?.getAttribute("aria-current")).toBe("page");
    expect(links[1]?.querySelector("img")?.getAttribute("src")).toBe("https://img.test/b-swatch.jpg");
    expect(view.querySelector(".color-options-head .subtle")?.textContent).toBe("2 colours");
  });
});
