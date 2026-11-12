import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import type { AuthClient } from "../api/auth-client.ts";
import type { AppConfig } from "../config/app-config.ts";
import { createPickyRouter, type PickyRouterContext } from "../router.tsx";

/**
 * Server-side entry, built by `vite build --ssr` and run once at build time (prerender.ts): renders a public
 * page as a signed-out visitor sees it, so search engines and link previews get the page's words in the HTML
 * instead of an empty <div id="root">. The browser then renders the live app over it (main.tsx).
 *
 * @example await renderPublicPage("/extension", { extensionUrl: "https://chromewebstore.google.com/…" }) // '<div class="app">…'
 */
export async function renderPublicPage(path: string, config: AppConfig): Promise<string> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const context: PickyRouterContext = {
    queryClient,
    authClient: signedOutAuthClient,
    productsClient: unavailable("productsClient"),
    comparisonsClient: unavailable("comparisonsClient"),
    cartsClient: unavailable("cartsClient"),
    extensionBridge: { isAvailable: () => false, importLink: unavailable("extensionBridge") },
    config,
    // Neutral key labels ("Alt + Shift + S"); the browser re-renders them for the visitor's own keyboard.
    os: "windows",
  };
  const router = createPickyRouter(context, createMemoryHistory({ initialEntries: [path] }));
  await router.load();
  if (router.state.location.pathname !== path) {
    throw new Error(
      `Prerendering "${path}" ended at "${router.state.location.pathname}"; public pages must not redirect`,
    );
  }
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

/** Prerendered pages show what a signed-out visitor (and a search engine) sees. */
const signedOutAuthClient: AuthClient = {
  currentUser: async () => null,
  signIn: unavailable("authClient.signIn"),
  signUp: unavailable("authClient.signUp"),
  signOut: unavailable("authClient.signOut"),
};

/** A stand-in for a dependency a signed-out public page never calls; calling it fails the build loudly. */
function unavailable<T>(name: string): T {
  const fail = () => {
    throw new Error(`${name} was called while prerendering; public pages must render without it`);
  };
  return new Proxy(fail, { get: () => fail }) as T;
}
