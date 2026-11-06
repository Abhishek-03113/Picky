import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, lazyRouteComponent } from "@tanstack/react-router";
import { currentUserQuery } from "../api/auth-queries.ts";

const rootRouteApi = getRouteApi("__root__");

// The homepage and the library share "/" but no visitor needs both, so each is its own chunk. Once preloaded,
// a lazy route component renders straight away instead of suspending.
const HomePage = lazyRouteComponent(() => import("./home-page.tsx"), "HomePage");
const ProductListPage = lazyRouteComponent(() => import("./product-list-page.tsx"), "ProductListPage");

/** Downloads the page "/" will show, so the route loader can fetch it alongside its data. */
export function preloadHomeRoutePage(signedIn: boolean): Promise<void> {
  return (signedIn ? ProductListPage : HomePage).preload?.() ?? Promise.resolve();
}

/** "/": the homepage for a visitor, the library for someone signed in. */
export function HomeRoutePage() {
  const { authClient } = rootRouteApi.useRouteContext();
  const { data: user } = useSuspenseQuery(currentUserQuery(authClient));
  return user === null ? <HomePage /> : <ProductListPage />;
}
