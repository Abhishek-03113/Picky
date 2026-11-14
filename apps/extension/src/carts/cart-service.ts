import type { CatalogCartSummary, ProductSnapshot } from "@picky/catalog";
import type { CartState } from "../messaging/messages.ts";
import { SignInRequiredError } from "../sign-in-required.ts";
import type { CartsClient } from "./carts-client.ts";

/** The API's quantity range for one cart line. */
const MAX_QUANTITY = 99;

export interface CartServiceDependencies {
  carts: CartsClient;
  settings: {
    lastCartId(): Promise<string | null>;
    setLastCartId(id: string): Promise<void>;
  };
  /** Stores the snapshot (POST /api/snapshots) and returns the product id. */
  sendSnapshot: (snapshot: ProductSnapshot) => Promise<string>;
  /** Mirrors the selected cart's item count on the toolbar badge. */
  badge: { showCartCount(count: number): Promise<void> };
  webBaseUrl: string;
}

/** Where an "Add to cart" went, so a toast can name the cart and Undo can put the quantity back. */
export interface CartPlacement {
  cart: CatalogCartSummary;
  productId: string;
  /** The quantity before this add; 0 when the product was not in the cart. */
  previousQuantity: number;
  quantity: number;
}

/**
 * Service-worker side of the cart: loads carts, remembers the last-used one, adds products (a product already
 * in the cart gets one more), changes quantities and removes items. Every change updates the toolbar badge.
 *
 * @example const state = await new CartService(deps).init()
 */
export class CartService {
  constructor(private readonly deps: CartServiceDependencies) {}

  /** All carts with the last-used one (or the first) loaded in full; signed out, an empty signed-out state. */
  async init(): Promise<CartState> {
    const carts = await this.deps.carts.list().catch((error: unknown) => {
      if (error instanceof SignInRequiredError) return null;
      throw error;
    });
    if (carts === null) return this.signedOutState();
    return this.stateFor(carts, pickInitial(carts, await this.deps.settings.lastCartId())?.id ?? null);
  }

  async select(cartId: string): Promise<CartState> {
    await this.deps.settings.setLastCartId(cartId);
    return this.stateFor(await this.deps.carts.list(), cartId);
  }

  /**
   * Saves the snapshot and puts it in the cart (the last-used one when `cartId` is null); a product already
   * there gets one more.
   *
   * @example await cartService.addSnapshot(null, snapshot) // into "My cart" on first use
   */
  async addSnapshot(cartId: string | null, snapshot: ProductSnapshot): Promise<CartState> {
    const placement = await this.addProduct(cartId, await this.deps.sendSnapshot(snapshot));
    return this.stateFor(await this.deps.carts.list(), placement.cart.id);
  }

  /** Puts an already-saved product in the cart, or one more of it; the right-click menu's path. */
  async addProduct(cartId: string | null, productId: string): Promise<CartPlacement> {
    const target = await this.targetCart(cartId);
    const previousQuantity = target.items.find((item) => item.productId === productId)?.quantity ?? 0;
    const quantity = Math.min(MAX_QUANTITY, previousQuantity + 1);
    const cart = await this.deps.carts.putItem(target.id, productId, { quantity });
    await this.deps.settings.setLastCartId(cart.id);
    await this.showCount(cart);
    return { cart, productId, previousQuantity, quantity };
  }

  /** A quantity below 1 removes the item; above the limit it is capped. */
  async setQuantity(cartId: string, productId: string, quantity: number): Promise<CartState> {
    if (quantity < 1) return this.remove(cartId, productId);
    const capped = Math.min(MAX_QUANTITY, Math.round(quantity));
    await this.showCount(await this.deps.carts.putItem(cartId, productId, { quantity: capped }));
    return this.stateFor(await this.deps.carts.list(), cartId);
  }

  async remove(cartId: string, productId: string): Promise<CartState> {
    await this.showCount(await this.deps.carts.removeItem(cartId, productId));
    return this.stateFor(await this.deps.carts.list(), cartId);
  }

  /**
   * Takes back an add (the toast's Undo): back to the quantity before it, or out of the cart.
   *
   * @example await cartService.undoAdd("c1", "p1", 0) // removes p1
   */
  async undoAdd(cartId: string, productId: string, previousQuantity: number): Promise<void> {
    const cart =
      previousQuantity < 1
        ? await this.deps.carts.removeItem(cartId, productId)
        : await this.deps.carts.putItem(cartId, productId, { quantity: previousQuantity });
    await this.showCount(cart);
  }

  private async targetCart(cartId: string | null): Promise<CatalogCartSummary> {
    const carts = await this.deps.carts.list();
    const target =
      cartId === null
        ? pickInitial(carts, await this.deps.settings.lastCartId())
        : carts.find((cart) => cart.id === cartId);
    if (target === undefined) throw new Error(`Picky cart ${cartId ?? "(last used)"} was not found; reload the page`);
    return target;
  }

  private async stateFor(carts: CatalogCartSummary[], selectedId: string | null): Promise<CartState> {
    const selected = carts.find((cart) => cart.id === selectedId);
    if (selected !== undefined) await this.showCount(selected);
    const cart = selected === undefined ? null : await this.deps.carts.find(selected.id);
    return { signedIn: true, carts, selectedId: cart?.id ?? null, cart, webBaseUrl: this.deps.webBaseUrl };
  }

  private showCount(cart: CatalogCartSummary): Promise<void> {
    return this.deps.badge.showCartCount(cart.items.length);
  }

  private signedOutState(): CartState {
    return { signedIn: false, carts: [], selectedId: null, cart: null, webBaseUrl: this.deps.webBaseUrl };
  }
}

function pickInitial(carts: readonly CatalogCartSummary[], lastUsedId: string | null): CatalogCartSummary | undefined {
  return carts.find((cart) => cart.id === lastUsedId) ?? carts[0];
}
