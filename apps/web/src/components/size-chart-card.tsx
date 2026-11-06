import {
  LENGTH_UNITS,
  sizeChartInUnit,
  sizeChartUnit,
  type LengthUnit,
  type SizeChart,
  type SizeChartTable,
} from "@picky/catalog";
import { useState } from "react";

interface SizeChartCardProps {
  charts: readonly SizeChart[];
}

/** The page's printed unit, or null when no table has a measurement column to convert. */
function convertibleUnit(charts: readonly SizeChart[]): LengthUnit | null {
  const tables = charts.filter((chart): chart is SizeChartTable => chart.kind === "table");
  return tables.map(sizeChartUnit).find((unit) => unit !== null) ?? null;
}

/**
 * The size charts in their own card, with an in/cm switch that converts every measurement column.
 * Tables scroll sideways inside the card when wider than it; uploaded chart images scale to fit.
 * Nothing when the page had no chart.
 */
export function SizeChartCard({ charts }: SizeChartCardProps) {
  const printedUnit = convertibleUnit(charts);
  const [unit, setUnit] = useState<LengthUnit>(printedUnit ?? "in");
  if (charts.length === 0) return null;
  return (
    <section className="card size-charts" aria-labelledby="size-charts-title">
      <div className="size-charts-head">
        <h2 id="size-charts-title">Size chart</h2>
        {printedUnit !== null && <UnitSwitch unit={unit} onChange={setUnit} />}
      </div>
      <div className="size-chart-list">
        {charts.map((chart, index) => (
          <figure className="size-chart" key={`${chart.title ?? ""}-${index}`}>
            {chart.title !== null && <figcaption>{chart.title}</figcaption>}
            {chart.kind === "table" ? (
              <ChartTable chart={sizeChartInUnit(chart, unit)} />
            ) : (
              <a className="size-chart-image" href={chart.imageUrl} target="_blank" rel="noopener noreferrer">
                <img src={chart.imageUrl} alt="Size chart, as the store shows it" loading="lazy" />
              </a>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

function UnitSwitch({ unit, onChange }: { unit: LengthUnit; onChange: (unit: LengthUnit) => void }) {
  return (
    <div className="unit-switch" role="group" aria-label="Units">
      {LENGTH_UNITS.map((option) => (
        <button key={option} type="button" aria-pressed={option === unit} onClick={() => onChange(option)}>
          {option}
        </button>
      ))}
    </div>
  );
}

function ChartTable({ chart }: { chart: SizeChartTable }) {
  return (
    <div className="size-chart-scroll" tabIndex={0}>
      <table>
        <thead>
          <tr>
            {chart.columns.map((column, index) => (
              <th scope="col" key={index}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((cells, rowIndex) => (
            <tr key={rowIndex}>
              {cells.map((cell, index) =>
                index === 0 ? (
                  <th scope="row" key={index}>
                    {cell}
                  </th>
                ) : (
                  <td key={index}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
