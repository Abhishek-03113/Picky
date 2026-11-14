import type { Money, PriceObservation, ProductSnapshot } from "@picky/catalog";

/** A product whose latest observed price is lower than the one before it. */
export interface PriceDrop {
  productId: string;
  title: string;
  from: Money;
  to: Money;
  observedAt: string;
}

/**
 * Storage for the prices a user's browser has seen, one append-only series per product.
 * Observations are only ever recorded from a snapshot the shopper saves; nothing re-checks prices on its own.
 */
export interface PriceObservationRepository {
  /**
   * Appends an observation when the snapshot has a price and it is the first one, differs in price,
   * currency or availability from the latest, or the latest is over 24 hours old. True when a row was added.
   */
  recordObservation(userId: string, productId: string, snapshot: ProductSnapshot): Promise<boolean>;
  /** Oldest first. Empty for an unknown product. */
  listObservations(userId: string, productId: string): Promise<PriceObservation[]>;
  /** Products whose latest observation, made after `since`, is cheaper than the previous one (same currency). */
  listRecentDrops(userId: string, since: Date): Promise<PriceDrop[]>;
}
