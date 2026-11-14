import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterContextProvider, RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import type { AuthClient } from "../../src/api/auth-client.ts";
import { FakeAuthClient } from "./fake-auth-client.ts";
import type { ProductsClient } from "../../src/api/products-client.ts";
import { FakeProductsClient } from "./fake-products-client.ts";
import { FakeComparisonsClient } from "./fake-comparisons-client.ts";
import type { ComparisonsClient } from "../../src/api/comparisons-client.ts";
import type { ExtensionBridge } from "../../src/api/extension-bridge.ts";
import { FakeExtensionBridge } from "./fake-extension-bridge.ts";
import type { CartsClient } from "../../src/api/carts-client.ts";
import type { CartSharingClient } from "../../src/api/cart-sharing-client.ts";
import type { PricesClient } from "../../src/api/price-queries.ts";
import { createPickyRouter } from "../../src/router.tsx";

/** No carts; any cart change fails loudly, since these renders never make one. */
const emptyCartsClient: CartsClient = {
  listCarts: async () => [],
  getCart: async (id) => Promise.reject(new Error(`No cart ${id} in the empty fake`)),
  createCart: async () => Promise.reject(new Error("The empty carts fake cannot create carts")),
  renameCart: async () => Promise.reject(new Error("The empty carts fake cannot rename carts")),
  deleteCart: async () => Promise.reject(new Error("The empty carts fake cannot delete carts")),
  setItem: async () => Promise.reject(new Error("The empty carts fake cannot add items")),
  removeItem: async () => Promise.reject(new Error("The empty carts fake cannot remove items")),
};

const unavailable = (what: string) => async (): Promise<never> =>
  Promise.reject(new Error(`The sharing fake cannot ${what}`));

/** No shared carts, no imports or backups: these renders never share. */
const emptySharingClient: CartSharingClient = {
  share: unavailable("share"),
  unshare: unavailable("unshare"),
  readShared: unavailable("read a shared cart"),
  importCart: unavailable("import"),
  exportUrl: (cartId: string, format: "json" | "csv") => `/api/carts/${cartId}/export?format=${format}`,
  backup: unavailable("back up"),
  restore: unavailable("restore"),
} as CartSharingClient;

/** Every product has no recorded prices yet, so no trend line renders. */
const emptyPricesClient: PricesClient = {
  getPriceHistory: async (productId) => ({ productId, observations: [] }),
};

/** Renders the real router at `path` against fake clients (signed in, extension installed by default), after loaders have run. */
export async function renderAppAt(
  path: string,
  productsClient: ProductsClient,
  comparisonsClient: ComparisonsClient = new FakeComparisonsClient(),
  authClient: AuthClient = new FakeAuthClient(),
  extensionBridge: ExtensionBridge = new FakeExtensionBridge(),
): Promise<string> {
  return (await renderAppWithRouter(path, productsClient, comparisonsClient, authClient, extensionBridge)).html;
}

/** Like renderAppAt, also handing back the router so tests can see where guards sent it. */
export async function renderAppWithRouter(
  path: string,
  productsClient: ProductsClient,
  comparisonsClient: ComparisonsClient = new FakeComparisonsClient(),
  authClient: AuthClient = new FakeAuthClient(),
  extensionBridge: ExtensionBridge = new FakeExtensionBridge(),
) {
  const { queryClient, router } = createTestRouter(
    path,
    productsClient,
    comparisonsClient,
    authClient,
    extensionBridge,
  );
  await router.load();
  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { html, router };
}

/** The real router at `path` over fake clients, not yet loaded. */
function createTestRouter(
  path: string,
  productsClient: ProductsClient,
  comparisonsClient: ComparisonsClient,
  authClient: AuthClient,
  extensionBridge: ExtensionBridge,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const config = { extensionUrl: "https://store.example/picky" };
  // Windows: the keys most tests expect spelled out ("Alt + Shift + S"); Mac labels are tested on their own.
  const os = "windows" as const;
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createPickyRouter(
    {
      queryClient,
      authClient,
      productsClient,
      comparisonsClient,
      cartsClient: emptyCartsClient,
      cartSharingClient: emptySharingClient,
      pricesClient: emptyPricesClient,
      extensionBridge,
      config,
      os,
    },
    history,
  );
  return { queryClient, router };
}

/**
 * Renders one component inside the app's router and query context, for components that read the router
 * context (the price trend) without being a page of their own.
 *
 * @example const html = await renderInApp(<PriceCard productId="p1" snapshot={makeSnapshot()} />)
 */
export async function renderInApp(element: ReactElement): Promise<string> {
  const { queryClient, router } = createTestRouter(
    "/",
    new FakeProductsClient(),
    new FakeComparisonsClient(),
    new FakeAuthClient(),
    new FakeExtensionBridge(),
  );
  await router.load();
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={router}>{element}</RouterContextProvider>
    </QueryClientProvider>,
  );
}
