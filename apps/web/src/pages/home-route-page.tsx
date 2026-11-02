import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { currentUserQuery } from "../api/auth-queries.ts";
import { HomePage } from "./home-page.tsx";
import { ProductListPage } from "./product-list-page.tsx";

const rootRouteApi = getRouteApi("__root__");

/** "/": the homepage for a visitor, the library for someone signed in. */
export function HomeRoutePage() {
  const { authClient } = rootRouteApi.useRouteContext();
  const { data: user } = useSuspenseQuery(currentUserQuery(authClient));
  return user === null ? <HomePage /> : <ProductListPage />;
}
