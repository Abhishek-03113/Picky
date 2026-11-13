import type { PriceObservation, ProductSnapshot } from "@picky/catalog";
import type { PriceDrop, PriceObservationRepository } from "../../src/prices/price-observation-repository.ts";
import type { ProductRepository } from "../../src/products/product-repository.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

interface StoredObservation {
  userId: string;
  productId: string;
  observation: PriceObservation;
}

/**
 * PriceObservationRepository held in memory. Observations are stamped with the snapshot's capture time,
 * so the 24-hour rule is deterministic. Product titles for drops come from the injected ProductRepository.
 */
export class InMemoryPriceObservationRepository implements PriceObservationRepository {
  private readonly stored: StoredObservation[] = [];

  constructor(private readonly products: ProductRepository) {}

  async recordObservation(userId: string, productId: string, snapshot: ProductSnapshot): Promise<boolean> {
    if (snapshot.price === null) return false;
    const observation: PriceObservation = {
      price: snapshot.price,
      listPrice: snapshot.listPrice,
      availability: snapshot.availability,
      observedAt: snapshot.capturedAt,
    };
    const latest = this.series(userId, productId).at(-1);
    if (latest !== undefined && isRepeat(latest, observation)) return false;
    this.stored.push({ userId, productId, observation });
    return true;
  }

  async listObservations(userId: string, productId: string): Promise<PriceObservation[]> {
    return this.series(userId, productId);
  }

  async listRecentDrops(userId: string, since: Date): Promise<PriceDrop[]> {
    const productIds = new Set(this.stored.filter((entry) => entry.userId === userId).map((e) => e.productId));
    const drops: PriceDrop[] = [];
    for (const productId of productIds) {
      const [previous, latest] = this.series(userId, productId).slice(-2);
      if (previous === undefined || latest === undefined) continue;
      const isCheaper =
        latest.price.currency === previous.price.currency && latest.price.amount < previous.price.amount;
      if (!isCheaper || new Date(latest.observedAt) <= since) continue;
      const product = await this.products.findProductById(userId, productId);
      if (product === null) continue;
      drops.push({
        productId,
        title: product.snapshot.title,
        from: previous.price,
        to: latest.price,
        observedAt: latest.observedAt,
      });
    }
    return drops.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  }

  private series(userId: string, productId: string): PriceObservation[] {
    return this.stored
      .filter((entry) => entry.userId === userId && entry.productId === productId)
      .map((entry) => entry.observation);
  }
}

/** Same price, currency and availability as the latest, and the latest is under 24 hours old. */
function isRepeat(latest: PriceObservation, next: PriceObservation): boolean {
  return (
    latest.price.amount === next.price.amount &&
    latest.price.currency === next.price.currency &&
    latest.availability === next.availability &&
    new Date(next.observedAt).getTime() - new Date(latest.observedAt).getTime() < DAY_MS
  );
}
