import { describe, expect, test } from "bun:test";
import { extractProductSnapshot } from "../src/extract/extract-product.ts";
import { wrapDomDocument } from "../src/page/dom-page.ts";
import { ProductSnapshotSchema } from "../src/product-snapshot-schema.ts";
import { PRODUCT_SOURCES, type ProductSource } from "../src/product-snapshot.ts";
import { DirectoryFixtureFiles } from "../src/testing/fixture-files.ts";
import { PAGE_FIXTURES_DIR, PageFixtureStore, readSnapshotFromHtml } from "../src/testing/page-fixtures.ts";
import { domFromHtml } from "./support/dom-from-html.ts";

// Golden tests over every captured page in test/fixtures/<source>/. Add one with
// `bun run fixtures:capture <url> <slug> <saved-page.html>`; after an intended extractor change, `bun run fixtures:refresh`.
const store = new PageFixtureStore(new DirectoryFixtureFiles(PAGE_FIXTURES_DIR));
const fixtures = await Promise.all((await store.listNames()).map((name) => store.read(name)));

// amazon.com shares the amazon.in extractor and has unit tests, but no captured page yet: capture one with
// `bun run fixtures:capture https://www.amazon.com/dp/<ASIN> <slug>` and drop it from this list.
const SOURCES_WITHOUT_FIXTURES: ReadonlySet<ProductSource> = new Set(["amazon.com"]);

test("there is at least one fixture per supported source", () => {
  const expected = PRODUCT_SOURCES.filter((source) => !SOURCES_WITHOUT_FIXTURES.has(source));
  expect(new Set(fixtures.map((fixture) => fixture.expected.source))).toEqual(new Set(expected));
});

describe.each(fixtures.map((fixture) => [fixture.name, fixture] as const))("fixture %s", (_name, fixture) => {
  test("server path (cheerio) reads the expected snapshot", () => {
    expect(readSnapshotFromHtml(fixture.html, fixture.url, fixture.capturedAt)).toEqual(fixture.expected);
  });

  test("extension path (live DOM) reads the same snapshot", () => {
    const page = wrapDomDocument(domFromHtml(fixture.html));
    expect(extractProductSnapshot(page, fixture.url, new Date(fixture.capturedAt))).toEqual(fixture.expected);
  });

  test("expected snapshot is valid and not degenerate", () => {
    expect(ProductSnapshotSchema.safeParse(fixture.expected).success).toBe(true);
    expect(fixture.expected.price).not.toBeNull();
    expect(fixture.expected.images.length).toBeGreaterThan(0);
    expect(fixture.expected.specGroups.length).toBeGreaterThan(0);
  });
});
