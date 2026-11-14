import type { CatalogCartSummary } from "@picky/catalog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { cartListQuery } from "../api/cart-queries.ts";
import { AppBar, BrandLink, MainNav } from "../components/app-bar.tsx";
import { CartIndexCard } from "../components/cart-index-card.tsx";
import { CartNameForm } from "../components/cart-name-form.tsx";
import { PlusIcon } from "../components/icons.tsx";
import { useCreateCart } from "../hooks/use-cart-mutations.ts";
import { usePageTitle } from "../hooks/use-page-title.ts";

const cartsIndexRouteApi = getRouteApi("/carts");

/** /carts: every cart as a card with its item count, plus "New cart"; an empty state when there are none. */
export function CartsIndexPage() {
  const { cartsClient } = cartsIndexRouteApi.useRouteContext();
  const { data: carts } = useSuspenseQuery(cartListQuery(cartsClient));
  usePageTitle("Carts");
  return (
    <>
      <AppBar sticky>
        <BrandLink />
        <MainNav />
      </AppBar>
      <main className="comparisons-index carts-index">
        <div className="comparisons-index-heading">
          <h1 className="page-title">Carts</h1>
          <NewCartEntry />
        </div>
        {carts.length === 0 ? <NoCartsYet /> : <CartCardGrid carts={carts} />}
      </main>
    </>
  );
}

/** "New cart" button that turns into the name form; creating opens the new, empty cart. */
function NewCartEntry() {
  const [editing, setEditing] = useState(false);
  const createCart = useCreateCart();
  if (!editing) {
    return (
      <button type="button" className="soft-button" onClick={() => setEditing(true)}>
        <PlusIcon size={16} />
        New cart
      </button>
    );
  }
  return (
    <CartNameForm
      isPending={createCart.isPending}
      errorMessage={createCart.isError ? createCart.error.message : null}
      onCreate={(name) => createCart.mutate(name)}
      onCancel={() => setEditing(false)}
    />
  );
}

function CartCardGrid({ carts }: { carts: readonly CatalogCartSummary[] }) {
  const now = new Date();
  return (
    <ul className="comparison-index-grid">
      {carts.map((cart) => (
        <li key={cart.id}>
          <CartIndexCard cart={cart} now={now} />
        </li>
      ))}
    </ul>
  );
}

function NoCartsYet() {
  return (
    <div className="card empty-state">
      <strong>No carts yet</strong>
      <p className="subtle">
        Press “Add to cart” on any saved product, or start an empty cart with “New cart”. Items from different stores
        are kept together and grouped by store.
      </p>
      <Link to="/" className="soft-button">
        See saved products
      </Link>
    </div>
  );
}
