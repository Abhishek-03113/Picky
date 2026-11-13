import type { CartItem, CartItemInput, CatalogCartDetail, CatalogCartSummary, SharedCartView } from "@picky/catalog";
import {
  DEFAULT_CART_NAME,
  type CartMergeLine,
  type CartMergeResult,
  type CartRepository,
  type SharedCartLine,
} from "../../src/carts/cart-repository.ts";
import type { ProductRepository } from "../../src/products/product-repository.ts";

interface StoredLine {
  productId: string;
  quantity: number;
  note: string | null;
  priceWhenAdded: CartItem["priceWhenAdded"];
  addedAt: string;
}

interface StoredCart {
  id: string;
  userId: string;
  name: string;
  lines: StoredLine[];
  shareSlug: string | null;
  updatedAt: number;
}

/**
 * CartRepository held in memory. Ids and share slugs are sequential and "time" ticks once per write,
 * so ordering assertions are deterministic. Products are resolved through the injected ProductRepository.
 */
export class InMemoryCartRepository implements CartRepository {
  private readonly carts = new Map<string, StoredCart>();
  private nextId = 1;
  private tick = 0;

  constructor(private readonly products: ProductRepository) {}

  async listCarts(userId: string): Promise<CatalogCartSummary[]> {
    if (this.ownedCarts(userId).length === 0) await this.createCart(userId, DEFAULT_CART_NAME);
    return this.ownedCarts(userId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(toSummary);
  }

  async createCart(userId: string, name: string): Promise<CatalogCartSummary> {
    const cart: StoredCart = {
      id: `cart-${this.nextId++}`,
      userId,
      name,
      lines: [],
      shareSlug: null,
      updatedAt: ++this.tick,
    };
    this.carts.set(cart.id, cart);
    return toSummary(cart);
  }

  async findCart(userId: string, id: string): Promise<CatalogCartDetail | null> {
    const cart = this.find(userId, id);
    if (cart === null) return null;
    const items = await this.resolveItems(userId, cart.lines);
    return { id, name: cart.name, items, shareSlug: cart.shareSlug, updatedAt: toIso(cart.updatedAt) };
  }

  async renameCart(userId: string, id: string, name: string): Promise<CatalogCartSummary | null> {
    return this.touch(userId, id, (cart) => void (cart.name = name));
  }

  async deleteCart(userId: string, id: string): Promise<boolean> {
    return this.find(userId, id) !== null && this.carts.delete(id);
  }

  async putItem(
    userId: string,
    id: string,
    productId: string,
    input: CartItemInput,
  ): Promise<CatalogCartSummary | null> {
    const product = await this.products.findProductById(userId, productId);
    if (product === null) return null;
    return this.touch(userId, id, (cart) => {
      const line = cart.lines.find((candidate) => candidate.productId === productId);
      if (line === undefined) {
        cart.lines.push({
          productId,
          quantity: input.quantity ?? 1,
          note: input.note ?? null,
          priceWhenAdded: product.snapshot.price,
          addedAt: toIso(this.tick + 1),
        });
        return;
      }
      if (input.quantity !== undefined) line.quantity = input.quantity;
      if (input.note !== undefined) line.note = input.note;
    });
  }

  async removeItem(userId: string, id: string, productId: string): Promise<CatalogCartSummary | null> {
    return this.touch(userId, id, (cart) => {
      cart.lines = cart.lines.filter((line) => line.productId !== productId);
    });
  }

  async mergeItems(userId: string, id: string, lines: readonly CartMergeLine[]): Promise<CartMergeResult | null> {
    const cart = this.find(userId, id);
    if (cart === null) return null;
    let added = 0;
    let merged = 0;
    for (const { productId, quantity, note } of lines) {
      const product = await this.products.findProductById(userId, productId);
      if (product === null) continue;
      const line = cart.lines.find((candidate) => candidate.productId === productId);
      if (line === undefined) {
        const addedAt = toIso(this.tick + 1);
        cart.lines.push({ productId, quantity, note, priceWhenAdded: product.snapshot.price, addedAt });
        added += 1;
      } else {
        line.quantity = Math.max(line.quantity, quantity);
        merged += 1;
      }
    }
    cart.updatedAt = ++this.tick;
    return { cart: toSummary(cart), added, merged };
  }

  async createShare(userId: string, id: string): Promise<string | null> {
    const cart = this.find(userId, id);
    if (cart === null) return null;
    cart.shareSlug ??= `share-${cart.id}`;
    return cart.shareSlug;
  }

  async revokeShare(userId: string, id: string): Promise<boolean> {
    const cart = this.find(userId, id);
    if (cart === null) return false;
    cart.shareSlug = null;
    return true;
  }

  async findSharedCart(slug: string): Promise<SharedCartView | null> {
    const cart = this.sharedCart(slug);
    const shared = await this.findSharedCartLines(slug);
    if (cart === null || shared === null) return null;
    const items = shared.lines.map(({ snapshot, quantity }) => ({
      source: snapshot.source,
      externalId: snapshot.externalId,
      title: snapshot.title,
      url: snapshot.url,
      image: snapshot.images[0] ?? null,
      price: snapshot.price,
      availability: snapshot.availability,
      variant: snapshot.variant,
      quantity,
    }));
    return { slug, name: cart.name, items, updatedAt: toIso(cart.updatedAt) };
  }

  async findSharedCartLines(slug: string): Promise<{ name: string; lines: SharedCartLine[] } | null> {
    const cart = this.sharedCart(slug);
    if (cart === null) return null;
    const items = await this.resolveItems(cart.userId, cart.lines);
    const lines = items.map((item) => ({ snapshot: item.product.snapshot, quantity: item.quantity }));
    return { name: cart.name, lines };
  }

  private sharedCart(slug: string): StoredCart | null {
    return [...this.carts.values()].find((cart) => cart.shareSlug === slug) ?? null;
  }

  private ownedCarts(userId: string): StoredCart[] {
    return [...this.carts.values()].filter((cart) => cart.userId === userId);
  }

  /** Another user's cart is as invisible as a missing one. */
  private find(userId: string, id: string): StoredCart | null {
    const cart = this.carts.get(id);
    return cart?.userId === userId ? cart : null;
  }

  private touch(userId: string, id: string, change: (cart: StoredCart) => void): CatalogCartSummary | null {
    const cart = this.find(userId, id);
    if (cart === null) return null;
    change(cart);
    cart.updatedAt = ++this.tick;
    return toSummary(cart);
  }

  private async resolveItems(userId: string, lines: readonly StoredLine[]): Promise<CartItem[]> {
    const items: CartItem[] = [];
    for (const line of lines) {
      const product = await this.products.findProductById(userId, line.productId);
      if (product !== null) items.push({ ...line, product });
    }
    return items;
  }
}

function toSummary(cart: StoredCart): CatalogCartSummary {
  const items = cart.lines.map(({ productId, quantity }) => ({ productId, quantity }));
  return { id: cart.id, name: cart.name, items, shareSlug: cart.shareSlug, updatedAt: toIso(cart.updatedAt) };
}

function toIso(tick: number): string {
  return new Date(Date.UTC(2026, 9, 5, 10, 0, tick)).toISOString();
}
