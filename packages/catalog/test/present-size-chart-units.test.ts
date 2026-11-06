import { describe, expect, test } from "bun:test";
import type { SizeChartTable } from "../src/product-snapshot.ts";
import { convertLength, measurementColumn, sizeChartInUnit, sizeChartUnit } from "../src/present/size-chart-units.ts";

const CHART: SizeChartTable = {
  kind: "table",
  title: "IN Regular",
  columns: ["Brand Size", "UK Size", "Chest (in)", "Waist (Inches)"],
  rows: [["S", "7", "36.5", "30-32"]],
};

describe("measurementColumn", () => {
  test("reads the unit in brackets and ignores size columns", () => {
    expect(measurementColumn("Chest (in)")).toEqual({ name: "Chest", unit: "in" });
    expect(measurementColumn("Waist (Inches)")).toEqual({ name: "Waist", unit: "in" });
    expect(measurementColumn("Length (CM)")).toEqual({ name: "Length", unit: "cm" });
    expect(measurementColumn("IN Size")).toBeNull();
    expect(measurementColumn("Brand Size")).toBeNull();
  });
});

describe("sizeChartUnit", () => {
  test("is the first measurement column's unit, or null when nothing converts", () => {
    expect(sizeChartUnit(CHART)).toBe("in");
    expect(sizeChartUnit({ ...CHART, columns: ["Brand Size", "EU Size"] })).toBeNull();
  });
});

describe("sizeChartInUnit", () => {
  test("converts only the measurement columns, relabelling their headers", () => {
    expect(sizeChartInUnit(CHART, "cm")).toEqual({
      ...CHART,
      columns: ["Brand Size", "UK Size", "Chest (cm)", "Waist (cm)"],
      rows: [["S", "7", "92.7", "76.2-81.3"]],
    });
  });

  test("round-trips back to inches", () => {
    expect(sizeChartInUnit(sizeChartInUnit(CHART, "cm"), "in").rows).toEqual([["S", "7", "36.5", "30-32"]]);
  });
});

describe("convertLength", () => {
  test("leaves same-unit cells and text alone", () => {
    expect(convertLength("36.5", "in", "in")).toBe("36.5");
    expect(convertLength("-", "in", "cm")).toBe("-");
    expect(convertLength("80 to 85", "cm", "in")).toBe("31.5 to 33.5");
  });
});
