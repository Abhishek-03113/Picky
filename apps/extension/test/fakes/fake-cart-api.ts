import type { ProductSnapshot } from "@picky/catalog";
import type { CartApi } from "../../src/carts/cart-api.ts";
import type { CartState } from "../../src/messaging/messages.ts";

/** In-memory CartApi: one signed-in shopper with one cart, "Desk setup"; records each call. */
export class FakeCartApi implements CartApi {
  readonly calls: string[] = [];
  failNext: Error | null = null;
  private readonly items = new Map<string, { snapshot: ProductSnapshot; quantity: number }>();

  async init(): Promise<CartState> {
    return this.answer("init");
  }

  async select(cartId: string): Promise<CartState> {
    return this.answer(`select ${cartId}`);
  }

  async add(cartId: string | null, snapshot: ProductSnapshot): Promise<CartState> {
    const id = `saved-${snapshot.externalId}`;
    this.items.set(id, { snapshot, quantity: (this.items.get(id)?.quantity ?? 0) + 1 });
    return this.answer(`add ${cartId ?? "last"} ${snapshot.externalId}`);
  }

  async setQuantity(cartId: string, productId: string, quantity: number): Promise<CartState> {
    const item = this.items.get(productId);
    if (item !== undefined && quantity >= 1) this.items.set(productId, { ...item, quantity });
    else this.items.delete(productId);
    return this.answer(`quantity ${cartId} ${productId} ${quantity}`);
  }

  async remove(cartId: string, productId: string): Promise<CartState> {
    this.items.delete(productId);
    return this.answer(`remove ${cartId} ${productId}`);
  }

  private answer(call: string): CartState {
    this.calls.push(call);
    if (this.failNext !== null) {
      const failure = this.failNext;
      this.failNext = null;
      throw failure;
    }
    const items = [...this.items].map(([id, { snapshot, quantity }]) => ({
      product: { id, snapshot, createdAt: "t", updatedAt: "t" },
      quantity,
      note: null,
      priceWhenAdded: snapshot.price,
      addedAt: "t",
    }));
    const cart = { id: "k1", name: "Desk setup", items, shareSlug: null, updatedAt: "t" };
    return {
      signedIn: true,
      carts: [{ ...cart, items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })) }],
      selectedId: "k1",
      cart,
      webBaseUrl: "http://web",
    };
  }
}
