import {
  LENGTH_UNITS,
  sizeChartInUnit,
  sizeChartUnit,
  type LengthUnit,
  type SizeChart,
  type SizeChartTable,
} from "@picky/catalog";
import type { Dom } from "../dom.ts";

/**
 * The size charts in their own card, with an in/cm switch that converts every measurement column.
 * Tables scroll sideways inside the card when wider than it; uploaded chart images scale to fit.
 * Nothing when the page had no chart. Mirrors the web app's SizeChartCard.
 *
 * @example container.append(...renderSpecSizeChartsView(dom, snapshot.sizeCharts))
 */
export function renderSpecSizeChartsView(dom: Dom, charts: readonly SizeChart[]): HTMLElement[] {
  if (charts.length === 0) return [];
  const tables = charts.filter((chart): chart is SizeChartTable => chart.kind === "table");
  const convertible = tables.map(sizeChartUnit).find((unit) => unit !== null) ?? null;
  const body = dom.el("div", { className: "size-chart-list" });
  const paint = (unit: LengthUnit): void => {
    body.replaceChildren(...charts.map((chart) => renderChart(dom, chart, unit)));
  };
  const head = dom.el("div", { className: "size-charts-head" }, [
    dom.el("h2", { attrs: { id: "size-charts-title" }, text: "Size chart" }),
  ]);
  if (convertible !== null) head.append(renderUnitSwitch(dom, convertible, paint));
  paint(convertible ?? "in");
  const attrs = { "aria-labelledby": "size-charts-title" };
  return [dom.el("section", { className: "spec-card size-charts", attrs }, [head, body])];
}

function renderUnitSwitch(dom: Dom, initial: LengthUnit, onChange: (unit: LengthUnit) => void): HTMLElement {
  const buttons = LENGTH_UNITS.map((unit) =>
    dom.el("button", { attrs: { type: "button", "aria-pressed": String(unit === initial) }, text: unit }),
  );
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      buttons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      onChange(LENGTH_UNITS[index] ?? initial);
    });
  });
  return dom.el("div", { className: "unit-switch", attrs: { role: "group", "aria-label": "Units" } }, buttons);
}

function renderChart(dom: Dom, chart: SizeChart, unit: LengthUnit): HTMLElement {
  const figure = dom.el("figure", { className: "size-chart" });
  if (chart.title !== null) figure.append(dom.el("figcaption", { text: chart.title }));
  figure.append(
    chart.kind === "table" ? renderTable(dom, sizeChartInUnit(chart, unit)) : renderImage(dom, chart.imageUrl),
  );
  return figure;
}

function renderTable(dom: Dom, chart: SizeChartTable): HTMLElement {
  const header = dom.el(
    "tr",
    {},
    chart.columns.map((column) => dom.el("th", { attrs: { scope: "col" }, text: column })),
  );
  const rows = chart.rows.map((cells) =>
    dom.el(
      "tr",
      {},
      cells.map((cell, index) =>
        dom.el(index === 0 ? "th" : "td", index === 0 ? { attrs: { scope: "row" }, text: cell } : { text: cell }),
      ),
    ),
  );
  const table = dom.el("table", {}, [dom.el("thead", {}, [header]), dom.el("tbody", {}, rows)]);
  return dom.el("div", { className: "size-chart-scroll", attrs: { tabindex: "0" } }, [table]);
}

function renderImage(dom: Dom, imageUrl: string): HTMLElement {
  const image = dom.el("img", { attrs: { src: imageUrl, alt: "Size chart, as the store shows it", loading: "lazy" } });
  const attrs = { href: imageUrl, target: "_blank", rel: "noopener noreferrer" };
  return dom.el("a", { className: "size-chart-image", attrs }, [image]);
}
