import { describe, expect, test } from "bun:test";
import type { ColorOption, ProductSnapshot } from "@picky/catalog";
import { ColorOptionsReader, MAX_COLOR_PAGES } from "../../src/link-capture/color-options-reader.ts";
import type { HtmlFetcher } from "../../src/link-capture/html-fetcher.ts";
import type { SnapshotReader } from "../../src/link-capture/snapshot-reader.ts";
import { buildSnapshot } from "../support/build-snapshot.ts";

const PRICE = { amount: 604, currency: "INR" };

function option(externalId: string, overrides: Partial<ColorOption> = {}): ColorOption {
  return {
    name: externalId,
    externalId,
    url: `https://www.amazon.in/dp/${externalId}`,
    swatchImage: null,
    selected: false,
    price: null,
    availability: null,
    image: null,
    ...overrides,
  };
}

/** Serves "<html>ASIN</html>" per URL; URLs listed in `failing` 404 and `hanging` never answer. */
class FakeColorPages implements HtmlFetcher, SnapshotReader {
  readonly fetched: string[] = [];
  inFlight = 0;
  maxInFlight = 0;

  constructor(private readonly options: { failing?: string[]; hanging?: string[] } = {}) {}

  async fetchHtml(url: string): Promise<string> {
    this.fetched.push(url);
    this.inFlight += 1;
    this.maxInFlight = Math.max(this.maxInFlight, this.inFlight);
    try {
      if (this.options.hanging?.includes(url)) await new Promise(() => {});
      await Promise.resolve();
      if (this.options.failing?.includes(url)) throw new Error(`Fetching ${url} returned HTTP 404`);
      return url.split("/dp/")[1] ?? "";
    } finally {
      this.inFlight -= 1;
    }
  }

  async read(html: string): Promise<ProductSnapshot> {
    return {
      ...buildSnapshot(),
      externalId: html,
      price: PRICE,
      availability: "In stock",
      images: [`https://x.test/${html}.jpg`],
    };
  }
}

function readerFor(pages: FakeColorPages, logs: string[] = [], timeoutMs?: number): ColorOptionsReader {
  return new ColorOptionsReader({ fetcher: pages, reader: pages, log: (event) => logs.push(event), timeoutMs });
}

describe("ColorOptionsReader", () => {
  test("reads each other colour's own page for its price, availability and photo", async () => {
    const pages = new FakeColorPages();
    const snapshot = {
      ...buildSnapshot(),
      colorOptions: [option("B1", { selected: true, price: PRICE }), option("B2")],
    };
    const filled = await readerFor(pages).fillIn(snapshot);
    expect(pages.fetched).toEqual(["https://www.amazon.in/dp/B2"]);
    expect(filled.colorOptions).toEqual([
      option("B1", { selected: true, price: PRICE }),
      option("B2", { price: PRICE, availability: "In stock", image: "https://x.test/B2.jpg" }),
    ]);
  });

  test("keeps a colour whose page fails or hangs as it was, and logs why", async () => {
    const pages = new FakeColorPages({
      failing: ["https://www.amazon.in/dp/B2"],
      hanging: ["https://www.amazon.in/dp/B3"],
    });
    const logs: string[] = [];
    const snapshot = {
      ...buildSnapshot(),
      colorOptions: [option("B1", { selected: true }), option("B2"), option("B3")],
    };
    const filled = await readerFor(pages, logs, 5).fillIn(snapshot);
    expect(filled.colorOptions).toEqual(snapshot.colorOptions);
    expect(logs.filter((event) => event === "color_options.read_failed")).toHaveLength(2);
  });

  test("reads at most MAX_COLOR_PAGES pages, a few at a time", async () => {
    const pages = new FakeColorPages();
    const colorOptions = Array.from({ length: MAX_COLOR_PAGES + 5 }, (_, index) => option(`B${index}`));
    const filled = await readerFor(pages).fillIn({ ...buildSnapshot(), colorOptions });
    expect(pages.fetched).toHaveLength(MAX_COLOR_PAGES);
    expect(pages.maxInFlight).toBeLessThanOrEqual(3);
    expect(filled.colorOptions.filter((entry) => entry.price !== null)).toHaveLength(MAX_COLOR_PAGES);
  });

  test("returns the snapshot untouched when there are no other colours", async () => {
    const pages = new FakeColorPages();
    const snapshot = buildSnapshot();
    expect(await readerFor(pages).fillIn(snapshot)).toBe(snapshot);
    expect(pages.fetched).toEqual([]);
  });
});
