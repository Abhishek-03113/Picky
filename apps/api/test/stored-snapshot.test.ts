import { describe, expect, test } from "bun:test";
import { fromStoredSnapshot } from "../src/products/stored-snapshot.ts";
import { buildSampleSnapshot } from "./support/sample-snapshot.ts";

describe("fromStoredSnapshot", () => {
  test("gives a row saved before categories, size charts and colours the schema's defaults", () => {
    const { category: _category, sizeCharts: _charts, colorOptions: _colors, ...older } = buildSampleSnapshot();
    expect(fromStoredSnapshot(older)).toEqual({ ...older, category: null, sizeCharts: [], colorOptions: [] });
  });

  test("leaves a current snapshot as it is", () => {
    const current = buildSampleSnapshot();
    expect(fromStoredSnapshot(current)).toEqual(current);
  });
});
