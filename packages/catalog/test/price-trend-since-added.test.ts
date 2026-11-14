import { describe, expect, test } from "bun:test";
import { describePriceTrend, observationsSinceAdded, sparklinePoints, type PriceObservation } from "../src/index.ts";

function seen(observedAt: string, amount: number): PriceObservation {
  return { price: { amount, currency: "INR" }, listPrice: null, availability: null, observedAt };
}

// Fell from 100 to 80 on day 2, before the shopper added the item on day 3; flat at 80 since.
const history = [
  seen("2026-10-01T10:00:00Z", 100),
  seen("2026-10-02T10:00:00Z", 80),
  seen("2026-10-04T10:00:00Z", 80),
  seen("2026-10-05T10:00:00Z", 80),
];
const addedAt = "2026-10-03T10:00:00Z";

describe("observationsSinceAdded", () => {
  test("starts at the last check before the add and drops the earlier drop", () => {
    expect(observationsSinceAdded(history, addedAt).map((o) => o.observedAt)).toEqual([
      "2026-10-02T10:00:00Z",
      "2026-10-04T10:00:00Z",
      "2026-10-05T10:00:00Z",
    ]);
  });

  test("keeps everything when the item was added before any check, and sorts oldest first", () => {
    expect(observationsSinceAdded([...history].reverse(), "2026-09-01T00:00:00Z")).toEqual(history);
  });

  test("a price that fell before the add draws a flat line that matches the 'No change' caption", () => {
    const window = observationsSinceAdded(history, addedAt);
    expect(describePriceTrend(window, { amount: 80, currency: "INR" })).toEqual({
      tone: "flat",
      text: "No change since you added it",
    });
    expect(sparklinePoints(window, 100, 20)).toBe("0,10 66.67,10 100,10");
    // The whole history would slope down while the caption says flat: the mismatch this window removes.
    expect(sparklinePoints(history, 100, 20)).toStartWith("0,0 ");
  });

  test("a fall after the add still slopes down and reads as less than when added", () => {
    const window = observationsSinceAdded([...history, seen("2026-10-06T10:00:00Z", 70)], addedAt);
    expect(describePriceTrend(window, { amount: 80, currency: "INR" }).tone).toBe("down");
    expect(sparklinePoints(window, 100, 20).split(" ").at(-1)).toBe("100,20");
  });
});
