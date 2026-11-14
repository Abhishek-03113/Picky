import {
  type CartItem,
  type CatalogCartDetail,
  formatList,
  groupCartByStore,
  pluralize,
} from "@picky/catalog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { cartDetailQuery, cartListQuery } from "../api/cart-queries.ts";
import { AppBar, BrandLink, MainNav } from "../components/app-bar.tsx";
import { CartHeaderActions } from "../components/cart-header-actions.tsx";
import { CartRemovedRow } from "../components/cart-removed-row.tsx";
import { CartStoreGroupCard } from "../components/cart-store-group.tsx";
import { CartSummaryCard } from "../components/cart-summary-card.tsx";
import { CartSwitcher } from "../components/cart-switcher.tsx";
import { CartTitle } from "../components/cart-title.tsx";
import {
  useRemoveCartItem,
  useRenameCart,
  useRestoreCartItem,
  useSetCartQuantity,
} from "../hooks/use-cart-mutations.ts";
import { usePageTitle } from "../hooks/use-page-title.ts";

const cartRouteApi = getRouteApi("/carts/$cartId");

/** /carts/$cartId: the cart's items grouped by store, beside its summary; stacked on a phone. */
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
      {/* Keyed by cart, so ticks and Undo notes never carry over to another cart. */}
      <CartView key={cart.id} cart={cart} />
    </>
  );
}

function CartView({ cart }: { cart: CatalogCartDetail }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // Ticks of items that have since left the cart do not count.
  const selectedProductIds = cart.items.map((item) => item.product.id).filter((id) => selected.has(id));
  const toggle = (productId: string) => {
    const next = new Set(selected);
    if (!next.delete(productId)) next.add(productId);
    setSelected(next);
  };
  return (
    <main className="cart-page">
      <CartHead cart={cart} selectedProductIds={selectedProductIds} />
      <div className={cart.items.length === 0 ? "cart-columns is-empty" : "cart-columns"}>
        <CartItems cart={cart} selected={selected} onToggleSelected={toggle} />
        {cart.items.length > 0 && <CartSummaryCard cartId={cart.id} items={cart.items} />}
      </div>
    </main>
  );
}

function CartHead({ cart, selectedProductIds }: { cart: CatalogCartDetail; selectedProductIds: readonly string[] }) {
  const { cartsClient } = cartRouteApi.useRouteContext();
  const { data: carts } = useSuspenseQuery(cartListQuery(cartsClient));
  const renameCart = useRenameCart();
  return (
    <div className="cart-head">
      <div className="cart-head-text">
        <CartSwitcher carts={carts} currentCartId={cart.id} />
        <CartTitle name={cart.name} onRename={(name) => renameCart.mutate({ cartId: cart.id, name })} />
        <p className="subtle">{cartSubtitle(cart.items)}</p>
      </div>
      <CartHeaderActions
        cartId={cart.id}
        cartName={cart.name}
        shareSlug={cart.shareSlug}
        carts={carts}
        selectedProductIds={selectedProductIds}
      />
    </div>
  );
}

/** "3 items from 2 stores", or "3 items from Amazon" when they all come from one. */
function cartSubtitle(items: readonly CartItem[]): string {
  const groups = groupCartByStore(items);
  const stores = groups.length === 1 ? formatList(groups.map((group) => group.label), "and") : pluralize(groups.length, "store");
  return `${pluralize(items.length, "item")} from ${stores}`;
}

interface CartItemsProps {
  cart: CatalogCartDetail;
  selected: ReadonlySet<string>;
  onToggleSelected: (productId: string) => void;
}

/** The left column: Undo notes for just-removed items, then one card per store (or how to add the first item). */
function CartItems({ cart, selected, onToggleSelected }: CartItemsProps) {
  const [removed, setRemoved] = useState<readonly CartItem[]>([]);
  const setQuantity = useSetCartQuantity();
  const removeItem = useRemoveCartItem();
  const restoreItem = useRestoreCartItem();
  const forget = (productId: string) => setRemoved((items) => items.filter((item) => item.product.id !== productId));
  const remove = (item: CartItem) => {
    setRemoved((items) => [...items, item]);
    removeItem.mutate({ cartId: cart.id, productId: item.product.id }, { onError: () => forget(item.product.id) });
  };
  const undo = (item: CartItem) =>
    restoreItem.mutate(
      { cartId: cart.id, productId: item.product.id, quantity: item.quantity, note: item.note },
      { onSuccess: () => forget(item.product.id) },
    );
  return (
    <div className="cart-items">
      {removed.map((item) => (
        <CartRemovedRow
          key={item.product.id}
          title={item.product.snapshot.title}
          isRestoring={restoreItem.isPending && restoreItem.variables?.productId === item.product.id}
          onUndo={() => undo(item)}
          onDismiss={() => forget(item.product.id)}
        />
      ))}
      {cart.items.length === 0 && <EmptyCart />}
      {groupCartByStore(cart.items).map((group) => (
        <CartStoreGroupCard
          key={group.source}
          group={group}
          selected={selected}
          onToggleSelected={onToggleSelected}
          onQuantityChange={(productId, quantity) => setQuantity.mutate({ cartId: cart.id, productId, quantity })}
          onRemove={remove}
        />
      ))}
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="card empty-state">
      <strong>This cart is empty</strong>
      <p className="subtle">
        Open a product in Saved and press “Add to cart”, or tick products in Saved and choose “Add to cart” in the bar
        at the bottom.
      </p>
      <Link to="/" className="soft-button">
        See saved products
      </Link>
    </div>
  );
}
