import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { cartDetailQuery } from "../api/cart-queries.ts";
import { AppBar, BrandLink, MainNav } from "../components/app-bar.tsx";
import { usePageTitle } from "../hooks/use-page-title.ts";

const cartRouteApi = getRouteApi("/carts/$cartId");

/** /carts/$cartId: one cart, grouped by store, beside its summary. */
export function CartPage() {
  const { cartId } = cartRouteApi.useParams();
  const { cartsClient } = cartRouteApi.useRouteContext();
  const { data: cart } = useSuspenseQuery(cartDetailQuery(cartsClient, cartId));
  usePageTitle(cart.name);
  return (
    <>
      <AppBar sticky>
        <BrandLink />
        <MainNav />
      </AppBar>
      <main className="cart-page">
        <h1 className="page-title">{cart.name}</h1>
      </main>
    </>
  );
}
