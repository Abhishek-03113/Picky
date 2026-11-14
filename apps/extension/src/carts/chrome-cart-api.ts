import type { ProductSnapshot } from "@picky/catalog";
import type { CartRequest, CartState, ExtensionResponse } from "../messaging/messages.ts";
import type { CartApi } from "./cart-api.ts";

type SendMessage = (request: CartRequest) => Promise<ExtensionResponse<CartState> | undefined>;

/**
 * CartApi over chrome.runtime.sendMessage. A missing reply (worker gone) or `ok: false` throws with the
 * reason, which the panel shows.
 *
 * @example const state = await new ChromeCartApi().init()
 */
export class ChromeCartApi implements CartApi {
  constructor(private readonly sendMessage: SendMessage = (request) => chrome.runtime.sendMessage(request)) {}

  init(): Promise<CartState> {
    return this.ask({ type: "cart:init" });
  }

  select(cartId: string): Promise<CartState> {
    return this.ask({ type: "cart:select", cartId });
  }

  add(cartId: string | null, snapshot: ProductSnapshot): Promise<CartState> {
    return this.ask({ type: "cart:add", cartId, snapshot });
  }

  setQuantity(cartId: string, productId: string, quantity: number): Promise<CartState> {
    return this.ask({ type: "cart:set-quantity", cartId, productId, quantity });
  }

  remove(cartId: string, productId: string): Promise<CartState> {
    return this.ask({ type: "cart:remove", cartId, productId });
  }

  private async ask(request: CartRequest): Promise<CartState> {
    const response = await this.sendMessage(request);
    if (response === undefined) throw new Error(`Picky service worker did not answer ${request.type}; reload the page`);
    if (!response.ok) throw new Error(response.message);
    return response.body;
  }
}
