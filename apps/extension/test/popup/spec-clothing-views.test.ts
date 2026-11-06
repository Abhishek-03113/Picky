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
  const blueRead: ColorOption = {
    ...(COLORS[1] as ColorOption),
    price: { amount: 604, currency: "INR" },
    availability: "In stock",
    image: "https://img.test/b.jpg",
  };
  const swatches = (view: HTMLElement) => [...view.querySelectorAll<HTMLButtonElement>(".color-swatch")];
  const preview = (view: HTMLElement, part: string) => view.querySelector(`.color-preview-${part}`)?.textContent;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  function mountColors(readColor: ((option: ColorOption) => Promise<ColorOption>) | null): HTMLElement {
    const { dom, root } = createTestDom();
    const view = renderSpecSheetView(dom, buildSpecSnapshot({ colorOptions: COLORS }), readColor);
    root.append(view);
    return view;
  }

  test("opens on this page's colour and never links away (no new tabs)", () => {
    const view = mountColors(null);
    expect(view.querySelectorAll(".color-options a")).toHaveLength(0);
    expect(preview(view, "name")).toBe("White");
    expect(preview(view, "price")).toBe("₹582");
    expect(swatches(view).map((swatch) => swatch.getAttribute("aria-label"))).toEqual(["White", "Blue"]);
    expect(swatches(view)[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(view.querySelector(".color-options-head .subtle")?.textContent).toBe("2 colours");
  });

  test("picking an unread colour reads its page in place, once, and shows its price and photo", async () => {
    const asked: string[] = [];
    const view = mountColors(async (option) => {
      asked.push(option.externalId);
      return blueRead;
    });
    swatches(view)[1]?.click();
    expect(preview(view, "price")).toBe("Reading this colour…");
    expect(swatches(view)[1]?.getAttribute("aria-pressed")).toBe("true");
    await settle();
    expect(preview(view, "name")).toBe("Blue");
    expect(preview(view, "price")).toBe("₹604");
    expect(view.querySelector(".color-preview-photo img")?.getAttribute("src")).toBe("https://img.test/b.jpg");

    swatches(view)[0]?.click();
    swatches(view)[1]?.click();
    await settle();
    expect(asked).toEqual(["B2"]);
  });

  test("a colour whose page fails says so, and a slow answer never overwrites a newer pick", async () => {
    let fail: (error: Error) => void = () => {};
    const view = mountColors(() => new Promise((_, reject) => (fail = reject)));
    swatches(view)[1]?.click();
    swatches(view)[0]?.click();
    fail(new Error("HTTP 503"));
    await settle();
    expect(preview(view, "name")).toBe("White");

    swatches(view)[1]?.click();
    fail(new Error("HTTP 503"));
    await settle();
    expect(preview(view, "price")).toBe("Couldn’t read this colour’s price");
  });

  test("without a reader an unread colour shows its swatch and no price", () => {
    const view = mountColors(null);
    swatches(view)[1]?.click();
    expect(preview(view, "price")).toBe("Price not shown for this colour");
    expect(view.querySelector(".color-preview-photo img")?.getAttribute("src")).toBe("https://img.test/b-swatch.jpg");
  });
});
