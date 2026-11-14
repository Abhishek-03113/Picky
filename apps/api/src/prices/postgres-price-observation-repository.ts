import type { SQL } from "bun";
import type { PriceObservation, ProductSnapshot } from "@picky/catalog";
import { isUuid } from "../db/uuid.ts";
import type { PriceDrop, PriceObservationRepository } from "./price-observation-repository.ts";

interface ObservationRow {
  amount: string;
  currency: string;
  list_amount: string | null;
  availability: string | null;
  observed_at: Date;
}

interface DropRow {
  product_id: string;
  title: string;
  currency: string;
  from_amount: string;
  to_amount: string;
  observed_at: Date;
}

/**
 * PriceObservationRepository on Postgres via Bun's built-in SQL client.
 *
 * @example await new PostgresPriceObservationRepository(sql).listObservations(userId, productId)
 */
export class PostgresPriceObservationRepository implements PriceObservationRepository {
  constructor(private readonly sql: SQL) {}

  async recordObservation(userId: string, productId: string, snapshot: ProductSnapshot): Promise<boolean> {
    const { price } = snapshot;
    if (price === null) return false;
    const listAmount = snapshot.listPrice?.amount ?? null;
    // One statement, so the "differs from latest" check and the insert see the same data.
    const rows: { id: string }[] = await this.sql`
      INSERT INTO price_observations (user_id, product_id, amount, currency, list_amount, availability)
      SELECT ${userId}::uuid, ${productId}::uuid, ${price.amount}::numeric, ${price.currency}::text,
             ${listAmount}::numeric, ${snapshot.availability}::text
      WHERE NOT EXISTS (
        SELECT 1 FROM (
          SELECT amount, currency, availability, observed_at FROM price_observations
          WHERE user_id = ${userId} AND product_id = ${productId}
          ORDER BY observed_at DESC, id DESC LIMIT 1
        ) AS latest
        WHERE latest.amount = ${price.amount}::numeric
          AND latest.currency = ${price.currency}::text
          AND latest.availability IS NOT DISTINCT FROM ${snapshot.availability}::text
          AND latest.observed_at > now() - interval '24 hours')
      RETURNING id`;
    return rows.length > 0;
  }

  async listObservations(userId: string, productId: string): Promise<PriceObservation[]> {
    if (!isUuid(productId)) return [];
    const rows: ObservationRow[] = await this.sql`
      SELECT amount, currency, list_amount, availability, observed_at FROM price_observations
      WHERE user_id = ${userId} AND product_id = ${productId}
      ORDER BY observed_at ASC, id ASC`;
    return rows.map(toObservation);
  }

  async listRecentDrops(userId: string, since: Date): Promise<PriceDrop[]> {
    const rows: DropRow[] = await this.sql`
      WITH ranked AS (
        SELECT product_id, amount, currency, observed_at,
               row_number() OVER (PARTITION BY product_id ORDER BY observed_at DESC, id DESC) AS rank
        FROM price_observations WHERE user_id = ${userId}
      )
      SELECT latest.product_id, p.snapshot->>'title' AS title, latest.currency,
             previous.amount AS from_amount, latest.amount AS to_amount, latest.observed_at
      FROM ranked latest
      JOIN ranked previous ON previous.product_id = latest.product_id AND previous.rank = 2
      JOIN products p ON p.user_id = ${userId} AND p.id = latest.product_id
      WHERE latest.rank = 1 AND latest.currency = previous.currency
        AND latest.amount < previous.amount AND latest.observed_at > ${since}
      ORDER BY latest.observed_at DESC`;
    return rows.map((row) => ({
      productId: row.product_id,
      title: row.title,
      from: { amount: Number(row.from_amount), currency: row.currency },
      to: { amount: Number(row.to_amount), currency: row.currency },
      observedAt: row.observed_at.toISOString(),
    }));
  }
}

function toObservation(row: ObservationRow): PriceObservation {
  return {
    price: { amount: Number(row.amount), currency: row.currency },
    listPrice: row.list_amount === null ? null : { amount: Number(row.list_amount), currency: row.currency },
    availability: row.availability,
    observedAt: row.observed_at.toISOString(),
  };
}
