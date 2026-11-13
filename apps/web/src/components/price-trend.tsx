import {
  describePriceTrend,
  observationsSinceAdded,
  pluralize,
  sameCurrencyObservations,
  sparklinePoints,
} from "@picky/catalog";
import type { Money } from "@picky/catalog";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { priceHistoryQuery } from "../api/price-queries.ts";

const rootRouteApi = getRouteApi("__root__");

const SPARKLINE_WIDTH = 120;
const SPARKLINE_HEIGHT = 28;

interface PriceTrendProps {
  productId: string;
  /** The price when the item went into a cart, to say "less than when you added it". */
  priceWhenAdded?: Money | null;
  /** When the item went into the cart: the line and the caption both cover only the checks since then. */
  addedAt?: string | null;
}

/**
 * How a product's price moved across the checks Picky has seen: a small line, a plain sentence and the
 * number of checks, all counted from when the item was added. Renders nothing until there are at least two checks.
 *
 * @example <PriceTrend productId={product.id} priceWhenAdded={item.priceWhenAdded} addedAt={item.addedAt} />
 */
export function PriceTrend({ productId, priceWhenAdded = null, addedAt = null }: PriceTrendProps) {
  const { pricesClient } = rootRouteApi.useRouteContext();
  const { data: history } = useQuery(priceHistoryQuery(pricesClient, productId));
  if (history === undefined) return null;
  const observations =
    addedAt === null
      ? sameCurrencyObservations(history.observations)
      : observationsSinceAdded(history.observations, addedAt);
  if (observations.length < 2) return null;
  const trend = describePriceTrend(observations, priceWhenAdded);
  return (
    <div className="price-trend">
      <svg
        className="price-trend-line"
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        width={SPARKLINE_WIDTH}
        height={SPARKLINE_HEIGHT}
        role="img"
        aria-label="Price over time"
      >
        <polyline points={sparklinePoints(observations, SPARKLINE_WIDTH, SPARKLINE_HEIGHT)} />
      </svg>
      <span className="price-trend-text">
        {trend.text !== "" && <span className={`price-trend-note ${trend.tone}`}>{trend.text}</span>}
        <span className="price-trend-basis">{`Based on ${pluralize(observations.length, "check")}`}</span>
      </span>
    </div>
  );
}
