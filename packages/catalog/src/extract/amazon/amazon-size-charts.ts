import { findFirst, type PageNode } from "../../page/page-node.ts";
import type { SizeChart, SizeChartImage, SizeChartTable } from "../../product-snapshot.ts";
import { textOrNull } from "../../text/normalize-text.ts";

// The "Size Chart" popover preloads every chart in the page (seen on Van Heusen polo B076CKF1GB and
// Levi's jeans): one section per fit, each a heading ("IN Regular") plus one or more tables.
// The class survives Amazon's script moving the popover into a modal, the popover's id may not.
const CHART_SECTIONS = ".fit-sizechartv2-tables-wrapper > div";

// Sellers can upload a picture instead: inside the same popover, or as an A+ content image.
const POPOVER_IMAGES = ".fit-sizechartv2-popover-content img, #a-popover-sizeGuide img";
const APLUS_IMAGES = "#aplus img";
const SIZE_CHART_ALT = /size\s*(?:chart|guide)/i;

/**
 * Reads the size charts a clothing or footwear page offers, tables first, then uploaded images.
 *
 * @example extractAmazonSizeCharts(page)[0] // { kind: "table", title: "IN Regular", columns: ["Brand Size", "Chest (in)"], rows: [["S", "36.5"], …] }
 */
export function extractAmazonSizeCharts(page: PageNode): SizeChart[] {
  return distinctCharts([...readChartTables(page), ...readChartImages(page)]);
}

function readChartTables(page: PageNode): SizeChartTable[] {
  return page.findAll(CHART_SECTIONS).flatMap((section) => {
    const title = textOrNull(findFirst(section, "h5")?.text());
    return section
      .findAll("table")
      .map((table) => readChartTable(table, title))
      .filter((chart): chart is SizeChartTable => chart !== null);
  });
}

function readChartTable(table: PageNode, title: string | null): SizeChartTable | null {
  const [header, ...body] = table.findAll("tr").map((row) => row.findAll("th, td").map((cell) => cell.text()));
  const columns = header?.filter((cell) => cell !== "") ?? [];
  const rows = body.filter((cells) => cells.some((cell) => cell !== ""));
  if (columns.length === 0 || rows.length === 0) return null;
  return { kind: "table", title, columns, rows };
}

function readChartImages(page: PageNode): SizeChartImage[] {
  const popoverImages = page.findAll(POPOVER_IMAGES);
  const aplusImages = page.findAll(APLUS_IMAGES).filter((image) => SIZE_CHART_ALT.test(image.attr("alt") ?? ""));
  return [...popoverImages, ...aplusImages]
    .map((image) => ({ src: lazyImageSource(image), alt: textOrNull(image.attr("alt")) }))
    .filter((image): image is { src: string; alt: string | null } => image.src !== null)
    .map((image) => ({ kind: "image", title: image.alt, imageUrl: image.src }));
}

/** A+ images load lazily: the real URL sits in data-src while src is a grey placeholder. */
function lazyImageSource(image: PageNode): string | null {
  const src = image.attr("data-src") ?? image.attr("src");
  return src !== null && src.startsWith("https://") && !src.includes("grey-pixel") ? src : null;
}

/** The live page can hold a chart twice (preload plus the opened modal); keep the first copy. */
function distinctCharts(charts: readonly SizeChart[]): SizeChart[] {
  const seen = new Set<string>();
  return charts.filter((chart) => {
    const key = JSON.stringify(chart);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
