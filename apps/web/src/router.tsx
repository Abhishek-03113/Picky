import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  type RouterHistory,
} from "@tanstack/react-router";
import type { AuthClient } from "./api/auth-client.ts";
import { cartDetailQuery, cartListQuery } from "./api/cart-queries.ts";
import type { CartsClient } from "./api/carts-client.ts";
import { comparisonDetailQuery, comparisonListQuery, productComparisonsQuery } from "./api/comparison-queries.ts";
import type { CartSharingClient } from "./api/cart-sharing-client.ts";
import type { PricesClient } from "./api/price-queries.ts";
import type { ComparisonsClient } from "./api/comparisons-client.ts";
import type { ExtensionBridge } from "./api/extension-bridge.ts";
import { productDetailQuery, productListQuery } from "./api/product-queries.ts";
import type { ProductsClient } from "./api/products-client.ts";
import {
  EXTENSION_PATH,
  PRIVACY_PATH,
  SIGN_IN_PATH,
  isSignedIn,
  requireSignedIn,
  skipSignInWhenSignedIn,
} from "./auth/route-guards.ts";
import { parseSignInSearch } from "./auth/sign-in-search.ts";
import type { OperatingSystem } from "@picky/catalog";
import type { AppConfig } from "./config/app-config.ts";
import { AppLayout } from "./components/app-layout.tsx";
import { RouteErrorPanel } from "./components/route-error-panel.tsx";
import { parseLibrarySearch } from "./library/library-search.ts";
import { HomeRoutePage, preloadHomeRoutePage } from "./pages/home-route-page.tsx";

// Each page is its own chunk, so a visitor downloads only the page they open (and the next one on hover,
// through `defaultPreload: "intent"`). The router fetches a route's chunk alongside its loader.
const ComparisonPage = lazyRouteComponent(() => import("./pages/comparison-page.tsx"), "ComparisonPage");
const ComparisonsIndexPage = lazyRouteComponent(
  () => import("./pages/comparisons-index-page.tsx"),
  "ComparisonsIndexPage",
);
const CartsIndexPage = lazyRouteComponent(() => import("./pages/carts-index-page.tsx"), "CartsIndexPage");
const CartPage = lazyRouteComponent(() => import("./pages/cart-page.tsx"), "CartPage");
const ProductDetailPage = lazyRouteComponent(() => import("./pages/product-detail-page.tsx"), "ProductDetailPage");
const ExtensionPage = lazyRouteComponent(() => import("./pages/extension-page.tsx"), "ExtensionPage");
const PrivacyPage = lazyRouteComponent(() => import("./pages/privacy-page.tsx"), "PrivacyPage");
const SharedCartPage = lazyRouteComponent(() => import("./pages/shared-cart-page.tsx"), "SharedCartPage");
const CheckoutPage = lazyRouteComponent(() => import("./pages/checkout-page.tsx"), "CheckoutPage");
const SignInPage = lazyRouteComponent(() => import("./pages/sign-in-page.tsx"), "SignInPage");

/** Dependencies handed to every route through router context, instead of module-level singletons. */
export interface PickyRouterContext {
  queryClient: QueryClient;
  authClient: AuthClient;
  productsClient: ProductsClient;
  comparisonsClient: ComparisonsClient;
  cartsClient: CartsClient;
  cartSharingClient: CartSharingClient;
  pricesClient: PricesClient;
  /** Paste-a-link import goes through the Picky extension, which can fetch store pages. */
  extensionBridge: ExtensionBridge;
  config: AppConfig;
  /** The visitor's OS, so keyboard shortcuts read as their keyboard labels them (⌥ ⇧ on a Mac). */
  os: OperatingSystem;
}

const rootRoute = createRootRouteWithContext<PickyRouterContext>()({
  beforeLoad: ({ context, location }) => requireSignedIn(context, location),
  // Every signed-in page shows the comparison and cart counts in the app bar (and "Add to cart" reads the
  // carts), so both lists are loaded once at the root.
  loader: async ({ context, location }) => {
    if (location.pathname === SIGN_IN_PATH || !(await isSignedIn(context))) return;
    await Promise.all([
      context.queryClient.ensureQueryData(comparisonListQuery(context.comparisonsClient)),
      context.queryClient.ensureQueryData(cartListQuery(context.cartsClient)),
    ]);
  },
  component: AppLayout,
  errorComponent: RouteErrorPanel,
});

const productListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: parseLibrarySearch,
  loaderDeps: ({ search }) => ({ query: search.q ?? "" }),
  // Signed out, "/" is the homepage, which needs no library.
  loader: async ({ context, deps }) => {
    const signedIn = await isSignedIn(context);
    const page = preloadHomeRoutePage(signedIn);
    if (signedIn) await context.queryClient.ensureQueryData(productListQuery(context.productsClient, deps.query));
    await page;
  },
  component: HomeRoutePage,
});

const productDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/products/$productId",
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productDetailQuery(context.productsClient, params.productId)),
      context.queryClient.ensureQueryData(productComparisonsQuery(context.comparisonsClient, params.productId)),
    ]),
  component: ProductDetailPage,
});

const comparisonsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/comparisons",
  // The list is already loaded by the root loader; the index page reads it from the cache.
  component: ComparisonsIndexPage,
});

const comparisonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/comparisons/$comparisonId",
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(comparisonDetailQuery(context.comparisonsClient, params.comparisonId)),
  component: ComparisonPage,
});

const cartsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/carts",
  // The list is already loaded by the root loader; the index page reads it from the cache.
  component: CartsIndexPage,
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/carts/$cartId",
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(cartDetailQuery(context.cartsClient, params.cartId)),
  component: CartPage,
});

const sharedCartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/c/$slug",
  validateSearch: (raw: Record<string, unknown>): { save?: boolean } => (raw["save"] === "1" || raw["save"] === 1 || raw["save"] === true ? { save: true } : {}),
  component: SharedCartPage,
});

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/carts/$cartId/checkout",
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(cartDetailQuery(context.cartsClient, params.cartId)),
  component: CheckoutPage,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: SIGN_IN_PATH,
  validateSearch: parseSignInSearch,
  beforeLoad: ({ context, search }) => skipSignInWhenSignedIn(context, search),
  component: SignInPage,
});

const extensionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: EXTENSION_PATH,
  component: ExtensionPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: PRIVACY_PATH,
  component: PrivacyPage,
});

const routeTree = rootRoute.addChildren([
  signInRoute,
  extensionRoute,
  privacyRoute,
  sharedCartRoute,
  checkoutRoute,
  productListRoute,
  productDetailRoute,
  comparisonsIndexRoute,
  comparisonRoute,
  cartsIndexRoute,
  cartRoute,
]);

/**
 * Builds the app router around injected dependencies.
 *
 * `history` defaults to the browser history; tests pass a memory history.
 *
 * @example createPickyRouter({ queryClient, authClient: createAuthClient(fetch, ""), productsClient, comparisonsClient, cartsClient, extensionBridge, config: readAppConfig(import.meta.env), os: "mac" })
 */
export function createPickyRouter(context: PickyRouterContext, history?: RouterHistory) {
  return createRouter({ routeTree, context, history, defaultPreload: "intent", defaultPreloadStaleTime: 0 });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createPickyRouter>;
  }
}
