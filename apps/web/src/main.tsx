import { detectOperatingSystem } from "@picky/catalog";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { inject as injectWebAnalytics } from "@vercel/analytics";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createAuthClient } from "./api/auth-client.ts";
import { createComparisonsClient } from "./api/comparisons-client.ts";
import { createWindowExtensionBridge } from "./api/extension-bridge.ts";
import { createProductsClient } from "./api/products-client.ts";
import { createSessionExpiryHandler } from "./auth/session-expiry.ts";
import { rememberSignedIn } from "./auth/signed-in-hint.ts";
import { readAppConfig } from "./config/app-config.ts";
import { createPickyRouter } from "./router.tsx";
import "@picky/ui-tokens/tokens.css";
import "@picky/ui-tokens/credit-footer.css";
import "./styles.css";

// Composition root for the browser: real fetch, same-origin API (Vite proxies /api in dev), so the
// HttpOnly session cookie travels with every request without any code handling it.
// The caches' error hook needs the router, which needs the cache: the arrows defer the lookup.
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error) => onApiError(error) }),
  mutationCache: new MutationCache({ onError: (error) => onApiError(error) }),
  defaultOptions: { queries: { staleTime: 30_000 } },
});
const router = createPickyRouter({
  queryClient,
  authClient: rememberSignedIn(createAuthClient(fetch.bind(window), ""), window.localStorage),
  productsClient: createProductsClient(fetch.bind(window), ""),
  comparisonsClient: createComparisonsClient(fetch.bind(window), ""),
  extensionBridge: createWindowExtensionBridge(window, () => crypto.randomUUID()),
  config: readAppConfig(import.meta.env),
  os: detectOperatingSystem(navigator),
});
const onApiError = createSessionExpiryHandler(queryClient, router);

// Vercel Web Analytics: privacy-friendly page views, no cookies. It follows client-side route changes on its own,
// and only reports from a Vercel deployment (in development it logs to the console instead).
injectWebAnalytics({ mode: import.meta.env.PROD ? "production" : "development" });

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error('Missing <div id="root"> in index.html; expected the Vite entry markup');

// Public pages arrive prerendered (prerender.ts). Rendering only once the first route has loaded means React's
// first paint is the finished page, so the prerendered copy stays on screen until then instead of blanking.
void router.load().finally(() =>
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  ),
);
