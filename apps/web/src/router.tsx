import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  type RouterHistory,
} from "@tanstack/react-router";
import type { AuthClient } from "./api/auth-client.ts";
import { comparisonDetailQuery, comparisonListQuery, productComparisonsQuery } from "./api/comparison-queries.ts";
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
const ProductDetailPage = lazyRouteComponent(() => import("./pages/product-detail-page.tsx"), "ProductDetailPage");
const ExtensionPage = lazyRouteComponent(() => import("./pages/extension-page.tsx"), "ExtensionPage");
const PrivacyPage = lazyRouteComponent(() => import("./pages/privacy-page.tsx"), "PrivacyPage");
const SignInPage = lazyRouteComponent(() => import("./pages/sign-in-page.tsx"), "SignInPage");

/** Dependencies handed to every route through router context, instead of module-level singletons. */
export interface PickyRouterContext {
  queryClient: QueryClient;
  authClient: AuthClient;
  productsClient: ProductsClient;
  comparisonsClient: ComparisonsClient;
  /** Paste-a-link import goes through the Picky extension, which can fetch store pages. */
  extensionBridge: ExtensionBridge;
  config: AppConfig;
  /** The visitor's OS, so keyboard shortcuts read as their keyboard labels them (⌥ ⇧ on a Mac). */
  os: OperatingSystem;
}

const rootRoute = createRootRouteWithContext<PickyRouterContext>()({
  beforeLoad: ({ context, location }) => requireSignedIn(context, location),
  // Every signed-in page shows the comparison count in the app bar, so the list is loaded once at the root.
  loader: async ({ context, location }) => {
    if (location.pathname === SIGN_IN_PATH || !(await isSignedIn(context))) return;
    await context.queryClient.ensureQueryData(comparisonListQuery(context.comparisonsClient));
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
  productListRoute,
  productDetailRoute,
  comparisonsIndexRoute,
  comparisonRoute,
]);

/**
 * Builds the app router around injected dependencies.
 *
 * `history` defaults to the browser history; tests pass a memory history.
 *
 * @example createPickyRouter({ queryClient, authClient: createAuthClient(fetch, ""), productsClient, comparisonsClient, extensionBridge, config: readAppConfig(import.meta.env), os: "mac" })
 */
export function createPickyRouter(context: PickyRouterContext, history?: RouterHistory) {
  return createRouter({ routeTree, context, history, defaultPreload: "intent", defaultPreloadStaleTime: 0 });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createPickyRouter>;
  }
}
