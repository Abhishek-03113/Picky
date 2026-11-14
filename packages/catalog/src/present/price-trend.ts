import type { PriceObservation } from "../cart/cart-types.ts";
import type { Money } from "../product-snapshot.ts";
import { formatMoney } from "./money-format.ts";

export interface PriceTrend {
  tone: "down" | "up" | "flat" | "none";
  text: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NO_TREND: PriceTrend = { tone: "none", text: "" };

/**
 * Observations in the currency of the latest one, oldest first. Other currencies are never compared.
 *
 * @example sameCurrencyObservations([inrOld, usdLatest]) // [usdLatest]
 */
export function sameCurrencyObservations(observations: readonly PriceObservation[]): PriceObservation[] {
  const sorted = [...observations].sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
  const latest = sorted.at(-1);
  if (latest === undefined) return [];
  return sorted.filter((observation) => observation.price.currency === latest.price.currency);
}

/**
 * The observations the "since you added it" caption speaks about: the last check at or before `addedAt`
 * (the price the shopper added it at) and every check after it, oldest first. Earlier drops are left out,
 * so a line drawn from this window slopes the same way as the caption reads.
 *
 * @example observationsSinceAdded([day1At100, day2At80, day4At80], "2026-10-03T00:00:00Z") // [day2At80, day4At80]
 */
export function observationsSinceAdded(observations: readonly PriceObservation[], addedAt: string): PriceObservation[] {
  const series = sameCurrencyObservations(observations);
  const added = Date.parse(addedAt);
  const firstAfter = series.findIndex((observation) => Date.parse(observation.observedAt) > added);
  const anchor = (firstAfter === -1 ? series.length : firstAfter) - 1;
  return series.slice(Math.max(anchor, 0));
}

/**
 * A plain, factual line about how the price moved; no advice. Tone is "none" with fewer than two
 * observations in the latest price's currency.
 *
 * @example describePriceTrend(observations, { amount: 5000, currency: "INR" }) // { tone: "down", text: "₹1,200 less than when you added it" }
 */
export function describePriceTrend(
  observations: readonly PriceObservation[],
  priceWhenAdded: Money | null,
): PriceTrend {
  const series = sameCurrencyObservations(observations);
  const latest = series.at(-1);
  if (latest === undefined || series.length < 2) return NO_TREND;

  const now = latest.price.amount;
  const earlier = series.slice(0, -1).map((observation) => observation.price.amount);
  const baseline = priceWhenAdded?.currency === latest.price.currency ? priceWhenAdded.amount : earlier[0]!;
  const money = (amount: number): Money => ({ amount, currency: latest.price.currency });

  if (now < baseline) {
    if (series.length >= 3 && now < Math.min(...earlier)) return { tone: "down", text: "Lowest since you saved it" };
    return { tone: "down", text: `${formatMoney(money(baseline - now))} less than when you added it` };
  }
  if (now > baseline) return { tone: "up", text: upText(series, latest, money(now - baseline)) };
  return { tone: "flat", text: "No change since you added it" };
}

/** "Up 4% this week" when the series spans a week, else the rise since the first reading. */
function upText(series: readonly PriceObservation[], latest: PriceObservation, rise: Money): string {
  const weekAgo = Date.parse(latest.observedAt) - WEEK_MS;
  const reference = [...series].reverse().find((observation) => Date.parse(observation.observedAt) <= weekAgo);
  if (reference !== undefined && latest.price.amount > reference.price.amount) {
    const percent = Math.round((latest.price.amount / reference.price.amount - 1) * 100);
    if (percent >= 1) return `Up ${percent}% this week`;
  }
  return `${formatMoney(rise)} more than when you added it`;
}

/**
 * The lowest and highest recorded price, in the latest price's currency; null with no observations.
 *
 * @example priceRange(observations) // { low: { amount: 4800, currency: "INR" }, high: { amount: 5200, currency: "INR" } }
 */
export function priceRange(observations: readonly PriceObservation[]): { low: Money; high: Money } | null {
  const series = sameCurrencyObservations(observations);
  const first = series[0];
  if (first === undefined) return null;
  const amounts = series.map((observation) => observation.price.amount);
  const { currency } = first.price;
  return { low: { amount: Math.min(...amounts), currency }, high: { amount: Math.max(...amounts), currency } };
}

/**
 * SVG polyline `points` for the price over time, filling width x height; higher prices are drawn higher
 * (smaller y). Empty string with fewer than two points.
 *
 * @example sparklinePoints(observations, 100, 20) // "0,20 50,0 100,10"
 */
export function sparklinePoints(observations: readonly PriceObservation[], width: number, height: number): string {
  const series = sameCurrencyObservations(observations);
  if (series.length < 2) return "";
  const times = series.map((observation) => Date.parse(observation.observedAt));
  const amounts = series.map((observation) => observation.price.amount);
  const [firstTime, lastTime] = [times[0]!, times.at(-1)!];
  const [low, high] = [Math.min(...amounts), Math.max(...amounts)];
  return series
    .map((_, index) => {
      const x =
        lastTime === firstTime
          ? (index / (series.length - 1)) * width
          : ((times[index]! - firstTime) / (lastTime - firstTime)) * width;
      const y = high === low ? height / 2 : height - ((amounts[index]! - low) / (high - low)) * height;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
