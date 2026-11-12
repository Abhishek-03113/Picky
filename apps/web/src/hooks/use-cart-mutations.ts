import type { CatalogCartDetail, CatalogCartSummary } from "@picky/catalog";
import { useMutation, useQueryClient, type QueryClient, type UseMutationResult } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { cartQueryKeys, forgetDeletedCart } from "../api/cart-queries.ts";
import { uniqueComparisonName } from "../comparison/comparison-labels.ts";

const rootRouteApi = getRouteApi("__root__");

/** Name a cart gets when the shopper adds to a cart before naming any: "Cart", then "Cart 2". */
export const DEFAULT_CART_NAME = "Cart";

/** Where items go: an existing cart, or a new one created first under this name. */
export type CartTarget = { cartId: string } | { newCartName: string };

/** Refreshes every cart query (nav count, menus, detail) after a change. */
function useRefreshCarts(): () => Promise<void> {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: cartQueryKeys.all });
}

/** Names of the carts already loaded, read at call time, so a new cart never repeats one. */
function useUniqueCartName(): (name: string) => string {
  const queryClient = useQueryClient();
  return (name) =>
    uniqueComparisonName(
      name,
      (queryClient.getQueryData<CatalogCartSummary[]>(cartQueryKeys.list) ?? []).map((cart) => cart.name),
    );
}

/**
 * Creates an empty cart and opens it; a name already in use gets a number ("Cart 2").
 *
 * @example useCreateCart().mutate("Diwali gifts")
 */
export function useCreateCart(): UseMutationResult<CatalogCartSummary, Error, string> {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const refresh = useRefreshCarts();
  const uniqueName = useUniqueCartName();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (name: string) => cartsClient.createCart(uniqueName(name)),
    onSuccess: async (cart) => {
      await refresh();
      await navigate({ to: "/carts/$cartId", params: { cartId: cart.id } });
    },
  });
}

/**
 * Puts products in a cart (quantity 1 for new items; items already there keep theirs), creating the cart
 * first when the target is a new one.
 *
 * @example useAddToCart().mutate({ target: { cartId }, productIds: ["p1"] })
 */
export function useAddToCart(): UseMutationResult<
  CatalogCartSummary,
  Error,
  { target: CartTarget; productIds: readonly string[] }
> {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const refresh = useRefreshCarts();
  const uniqueName = useUniqueCartName();
  return useMutation({
    mutationFn: async ({ target, productIds }) => {
      const cartId =
        "cartId" in target ? target.cartId : (await cartsClient.createCart(uniqueName(target.newCartName))).id;
      // Sequential on purpose: the server appends at max(position)+1, so parallel adds would race for order.
      let latest: CatalogCartSummary | undefined;
      for (const productId of productIds) latest = await cartsClient.setItem(cartId, productId);
      if (latest === undefined) throw new Error(`No product ids to add to cart ${cartId}; expected at least one`);
      return latest;
    },
    onSuccess: refresh,
  });
}

interface CartCacheSnapshot {
  list: CatalogCartSummary[] | undefined;
  detail: CatalogCartDetail | undefined;
}

/** Stops in-flight cart fetches and remembers the list and the cart's detail, so a failure can restore them. */
async function snapshotCart(queryClient: QueryClient, cartId: string): Promise<CartCacheSnapshot> {
  await queryClient.cancelQueries({ queryKey: cartQueryKeys.all });
  return {
    list: queryClient.getQueryData<CatalogCartSummary[]>(cartQueryKeys.list),
    detail: queryClient.getQueryData<CatalogCartDetail>(cartQueryKeys.detail(cartId)),
  };
}

function restoreCart(queryClient: QueryClient, cartId: string, snapshot: CartCacheSnapshot | undefined): void {
  if (snapshot === undefined) return;
  queryClient.setQueryData(cartQueryKeys.list, snapshot.list);
  queryClient.setQueryData(cartQueryKeys.detail(cartId), snapshot.detail);
}

/** Applies `change` to one cart's line list in the cached cart list. */
function patchListedCart(
  queryClient: QueryClient,
  cartId: string,
  change: (items: CatalogCartSummary["items"]) => CatalogCartSummary["items"],
): void {
  queryClient.setQueryData<CatalogCartSummary[]>(cartQueryKeys.list, (carts) =>
    carts?.map((cart) => (cart.id === cartId ? { ...cart, items: change(cart.items) } : cart)),
  );
}

/**
 * Changes how many of a product the cart holds (1 to 99). The number changes on screen at once and
 * goes back if the API refuses.
 *
 * @example useSetCartQuantity().mutate({ cartId, productId, quantity: 3 })
 */
export function useSetCartQuantity(): UseMutationResult<
  CatalogCartSummary,
  Error,
  { cartId: string; productId: string; quantity: number },
  CartCacheSnapshot
> {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const refresh = useRefreshCarts();
  return useMutation({
    mutationFn: ({ cartId, productId, quantity }) => cartsClient.setItem(cartId, productId, { quantity }),
    onMutate: async ({ cartId, productId, quantity }) => {
      const snapshot = await snapshotCart(queryClient, cartId);
      patchListedCart(queryClient, cartId, (items) =>
        items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
      );
      queryClient.setQueryData<CatalogCartDetail>(cartQueryKeys.detail(cartId), (cart) =>
        cart === undefined
          ? cart
          : {
              ...cart,
              items: cart.items.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
            },
      );
      return snapshot;
    },
    onError: (_error, { cartId }, snapshot) => restoreCart(queryClient, cartId, snapshot),
    onSettled: refresh,
  });
}

/**
 * Takes a product out of a cart; it leaves the screen at once and comes back if the API refuses.
 *
 * @example useRemoveCartItem().mutate({ cartId, productId })
 */
export function useRemoveCartItem(): UseMutationResult<
  CatalogCartSummary,
  Error,
  { cartId: string; productId: string },
  CartCacheSnapshot
> {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const refresh = useRefreshCarts();
  return useMutation({
    mutationFn: ({ cartId, productId }) => cartsClient.removeItem(cartId, productId),
    onMutate: async ({ cartId, productId }) => {
      const snapshot = await snapshotCart(queryClient, cartId);
      patchListedCart(queryClient, cartId, (items) => items.filter((item) => item.productId !== productId));
      queryClient.setQueryData<CatalogCartDetail>(cartQueryKeys.detail(cartId), (cart) =>
        cart === undefined ? cart : { ...cart, items: cart.items.filter((item) => item.product.id !== productId) },
      );
      return snapshot;
    },
    onError: (_error, { cartId }, snapshot) => restoreCart(queryClient, cartId, snapshot),
    onSettled: refresh,
  });
}

/**
 * Puts a just-removed item back with the quantity and note it had (Undo).
 *
 * @example useRestoreCartItem().mutate({ cartId, productId, quantity: 2, note: null })
 */
export function useRestoreCartItem(): UseMutationResult<
  CatalogCartSummary,
  Error,
  { cartId: string; productId: string; quantity: number; note: string | null }
> {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const refresh = useRefreshCarts();
  return useMutation({
    mutationFn: ({ cartId, productId, quantity, note }) => cartsClient.setItem(cartId, productId, { quantity, note }),
    onSuccess: refresh,
  });
}

/**
 * Renames a cart.
 *
 * @example useRenameCart().mutate({ cartId, name: "Diwali gifts" })
 */
export function useRenameCart(): UseMutationResult<CatalogCartSummary, Error, { cartId: string; name: string }> {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const refresh = useRefreshCarts();
  return useMutation({
    mutationFn: ({ cartId, name }) => cartsClient.renameCart(cartId, name),
    onSuccess: refresh,
  });
}

/**
 * Deletes a cart (its products stay in Saved) and returns to the carts index.
 *
 * @example useDeleteCart().mutate(cartId)
 */
export function useDeleteCart(): UseMutationResult<void, Error, string> {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const refresh = useRefreshCarts();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (cartId: string) => cartsClient.deleteCart(cartId),
    onSuccess: async (_deleted, cartId) => {
      // Leave the page first, so the refresh does not refetch the deleted cart into a 404.
      await navigate({ to: "/carts" });
      forgetDeletedCart(queryClient, cartId);
      await refresh();
    },
  });
}
