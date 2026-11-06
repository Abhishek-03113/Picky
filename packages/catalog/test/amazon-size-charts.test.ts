import { describe, expect, test } from "bun:test";
import { extractAmazonSizeCharts } from "../src/extract/amazon/amazon-size-charts.ts";
import { parseHtmlPage } from "../src/page/cheerio-page.ts";

const IMAGE = "https://m.media-amazon.com/images/I/chart.jpg";

function popover(sections: string): string {
  return `<div id="a-popover-sizeGuide"><div class="fit-sizechartv2-popover-content">
    <div class="fit-sizechartv2-tables-wrapper">${sections}</div></div></div>`;
}

function section(index: number, title: string, rows: string): string {
  return `<div id="fit-sizechartv2-${index}"><h5>${title}</h5><div class="a-scroller">
    <table id="fit-sizechartv2-${index}-table-0"><tbody>${rows}</tbody></table></div></div>`;
}

const POLO_ROWS = `<tr><th>Brand Size</th><th>Chest (in)</th></tr>
  <tr><th>S</th><td>36.5</td></tr><tr><th>M</th><td>38.5</td></tr>`;

describe("extractAmazonSizeCharts", () => {
  test("reads each fit's table with its heading, header row and size rows", () => {
    const page = parseHtmlPage(popover(section(0, "IN Regular", POLO_ROWS) + section(1, "IN Slim", POLO_ROWS)));
    expect(extractAmazonSizeCharts(page)).toEqual([
      {
        kind: "table",
        title: "IN Regular",
        columns: ["Brand Size", "Chest (in)"],
        rows: [
          ["S", "36.5"],
          ["M", "38.5"],
        ],
      },
      {
        kind: "table",
        title: "IN Slim",
        columns: ["Brand Size", "Chest (in)"],
        rows: [
          ["S", "36.5"],
          ["M", "38.5"],
        ],
      },
    ]);
  });

  test("keeps one copy of a chart the page holds twice", () => {
    const page = parseHtmlPage(
      popover(section(0, "IN Regular", POLO_ROWS)) + popover(section(0, "IN Regular", POLO_ROWS)),
    );
    expect(extractAmazonSizeCharts(page)).toHaveLength(1);
  });

  test("skips a table with a header but no sizes", () => {
    const page = parseHtmlPage(popover(section(0, "IN Regular", "<tr><th>Brand Size</th></tr>")));
    expect(extractAmazonSizeCharts(page)).toEqual([]);
  });

  test("reads an uploaded chart image from the popover or a size-chart A+ image", () => {
    const page = parseHtmlPage(`<div id="a-popover-sizeGuide"><img src="${IMAGE}" alt="Size chart"></div>
      <div id="aplus"><img src="https://m.media-amazon.com/images/G/31/grey-pixel.gif" data-src="${IMAGE}2" alt="Size Guide">
      <img src="${IMAGE}3" alt="Lifestyle photo"></div>`);
    expect(extractAmazonSizeCharts(page)).toEqual([
      { kind: "image", title: "Size chart", imageUrl: IMAGE },
      { kind: "image", title: "Size Guide", imageUrl: `${IMAGE}2` },
    ]);
  });

  test("returns [] for pages without a size chart", () => {
    expect(extractAmazonSizeCharts(parseHtmlPage("<p>Headphones</p>"))).toEqual([]);
  });
});
