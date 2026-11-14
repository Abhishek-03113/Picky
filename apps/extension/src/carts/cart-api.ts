import type { ProductSnapshot } from "@picky/catalog";
import type { CartState } from "../messaging/messages.ts";

/** What the Picky panel's cart controls need from the service worker; chrome-cart-api.ts implements it over runtime messages. */
export interface CartApi {
  init(): Promise<CartState>;
  select(cartId: string): Promise<CartState>;
  /** `cartId: null` adds to the last-used cart. A product already in the cart gets one more. */
  add(cartId: string | null, snapshot: ProductSnapshot): Promise<CartState>;
  /** A quantity below 1 removes the item. */
  setQuantity(cartId: string, productId: string, quantity: number): Promise<CartState>;
  remove(cartId: string, productId: string): Promise<CartState>;
}
