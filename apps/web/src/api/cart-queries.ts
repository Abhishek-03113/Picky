import type { CatalogCartSummary } from "@picky/catalog";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { CartsClient } from "./carts-client.ts";

export const cartQueryKeys = {
  /** Prefix of every cart query: invalidate it after any item or name change. */
  all: ["carts"] as const,
  list: ["carts", "list"] as const,
  detail: (id: string) => ["carts", "detail", id] as const,
};

/**
 * Query for every cart (nav count, cart switcher, "Add to cart" menus).
 *
 * @example useSuspenseQuery(cartListQuery(cartsClient))
 */
export function cartListQuery(client: CartsClient) {
  return queryOptions({ queryKey: cartQueryKeys.list, queryFn: () => client.listCarts() });
}

/**
 * Query for one cart with its products in full.
 *
 * @example queryClient.ensureQueryData(cartDetailQuery(cartsClient, id))
 */
export function cartDetailQuery(client: CartsClient, id: string) {
  return queryOptions({ queryKey: cartQueryKeys.detail(id), queryFn: () => client.getCart(id) });
}

/**
 * Number of lines across every cart, for the "Carts" nav count (a line of quantity 3 counts once).
 *
 * @example cartLineCount([{ items: [{ productId: "p1", quantity: 3 }] }]) // 1
 */
export function cartLineCount(carts: readonly Pick<CatalogCartSummary, "items">[]): number {
  return carts.reduce((count, cart) => count + cart.items.length, 0);
}

/**
 * Drops a deleted cart from the cache: out of the list (so the nav count and index update before the
 * refetch lands) and its detail query removed, so nothing ever refetches it into a 404.
 *
 * @example forgetDeletedCart(queryClient, "c1")
 */
export function forgetDeletedCart(queryClient: QueryClient, cartId: string): void {
  queryClient.setQueryData<CatalogCartSummary[]>(cartQueryKeys.list, (carts) =>
    carts?.filter((cart) => cart.id !== cartId),
  );
  queryClient.removeQueries({ queryKey: cartQueryKeys.detail(cartId), exact: true });
}
