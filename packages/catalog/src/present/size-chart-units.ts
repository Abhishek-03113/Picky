import type { SizeChartTable } from "../product-snapshot.ts";

export const LENGTH_UNITS = ["in", "cm"] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

const CM_PER_INCH = 2.54;
// A measurement column names its unit in brackets: "Chest (in)", "Waist (Inches)", "Length (cm)".
const UNIT_IN_HEADER = /^(.*?)\s*\(\s*(in|inch|inches|cm|cms|centimet(?:er|re)s?)\s*\)$/i;
const NUMBER = /\d+(?:\.\d+)?/g;

interface MeasurementColumn {
  name: string;
  unit: LengthUnit;
}

/**
 * The column's name and length unit, or null for a column that is not a measurement (e.g. "UK Size").
 *
 * @example measurementColumn("Chest (in)") // { name: "Chest", unit: "in" }
 */
export function measurementColumn(header: string): MeasurementColumn | null {
  const match = UNIT_IN_HEADER.exec(header.trim());
  if (match === null) return null;
  const unit = match[2]?.toLowerCase().startsWith("c") ? "cm" : "in";
  return { name: match[1] ?? header, unit };
}

/**
 * The unit the chart was printed in, or null when no column is a measurement (nothing to convert).
 *
 * @example sizeChartUnit({ kind: "table", title: null, columns: ["Size", "Chest (in)"], rows: [["S", "36"]] }) // "in"
 */
export function sizeChartUnit(chart: SizeChartTable): LengthUnit | null {
  for (const column of chart.columns) {
    const measurement = measurementColumn(column);
    if (measurement !== null) return measurement.unit;
  }
  return null;
}

/**
 * The chart with every measurement column shown in `unit`; other columns are untouched.
 *
 * @example sizeChartInUnit(chart, "cm").columns // ["Brand Size", "Chest (cm)"], rows [["S", "92.7"]]
 */
export function sizeChartInUnit(chart: SizeChartTable, unit: LengthUnit): SizeChartTable {
  const columns = chart.columns.map(measurementColumn);
  return {
    ...chart,
    columns: chart.columns.map((header, index) => {
      const measurement = columns[index];
      return measurement === null || measurement === undefined ? header : `${measurement.name} (${unit})`;
    }),
    rows: chart.rows.map((cells) =>
      cells.map((cell, index) => {
        const measurement = columns[index];
        return measurement === null || measurement === undefined ? cell : convertLength(cell, measurement.unit, unit);
      }),
    ),
  };
}

/**
 * Converts every number in a cell, so ranges ("32-34") and lists convert too. One decimal, no trailing ".0".
 *
 * @example convertLength("36.5", "in", "cm") // "92.7"
 * @example convertLength("80-85", "cm", "in") // "31.5-33.5"
 */
export function convertLength(cell: string, from: LengthUnit, to: LengthUnit): string {
  if (from === to) return cell;
  const factor = to === "cm" ? CM_PER_INCH : 1 / CM_PER_INCH;
  return cell.replace(NUMBER, (number) => String(Math.round(Number(number) * factor * 10) / 10));
}
