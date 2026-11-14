import type { CartItemInput, CatalogCartDetail, CatalogCartSummary } from "@picky/catalog";

/** The Picky carts API as the extension uses it; http-carts-client.ts implements it over fetch. */
export interface CartsClient {
  /** Every cart; the server creates "My cart" when the shopper has none, so a signed-in list is never empty. */
  list(): Promise<CatalogCartSummary[]>;
  find(cartId: string): Promise<CatalogCartDetail>;
  create(name: string): Promise<CatalogCartSummary>;
  /** Adds the product, or changes its quantity or note when it is already in the cart. */
  putItem(cartId: string, productId: string, input: CartItemInput): Promise<CatalogCartSummary>;
  removeItem(cartId: string, productId: string): Promise<CatalogCartSummary>;
}
