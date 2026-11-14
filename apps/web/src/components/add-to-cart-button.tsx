import type { CatalogCartSummary } from "@picky/catalog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { cartListQuery } from "../api/cart-queries.ts";
import { useRemoveCartItem, useSetCartQuantity } from "../hooks/use-cart-mutations.ts";
import { CartChooser } from "./cart-chooser.tsx";
import { CartQuantityStepper } from "./cart-quantity-stepper.tsx";

const rootRouteApi = getRouteApi("__root__");

interface AddToCartButtonProps {
  productId: string;
  /** Product title, for the stepper's button labels. */
  title: string;
  placement?: "below" | "above";
}

/**
 * "Add to cart" for one product; once it is in a cart, "In cart × n" (linking to that cart) with a stepper.
 *
 * @example <AddToCartButton productId={product.id} title={snapshot.title} />
 */
export function AddToCartButton({ productId, title, placement = "below" }: AddToCartButtonProps) {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const { data: carts } = useSuspenseQuery(cartListQuery(cartsClient));
  const holdingCart = carts.find((cart) => cart.items.some((item) => item.productId === productId));
  return (
    <div className="add-to-cart">
      {holdingCart === undefined ? (
        <CartChooser
          carts={carts}
          productIds={[productId]}
          placement={placement}
          triggerClassName="add-to-cart-button"
        />
      ) : (
        <InCartControl cart={holdingCart} productId={productId} title={title} />
      )}
    </div>
  );
}

interface InCartControlProps {
  cart: CatalogCartSummary;
  productId: string;
  title: string;
}

function InCartControl({ cart, productId, title }: InCartControlProps) {
  const setQuantity = useSetCartQuantity();
  const removeItem = useRemoveCartItem();
  const quantity = cart.items.find((item) => item.productId === productId)?.quantity ?? 1;
  return (
    <>
      <Link to="/carts/$cartId" params={{ cartId: cart.id }} className="in-cart-link" title={`Open ${cart.name}`}>
        In cart × {quantity}
      </Link>
      <CartQuantityStepper
        quantity={quantity}
        title={title}
        onChange={(next) => setQuantity.mutate({ cartId: cart.id, productId, quantity: next })}
        onRemove={() => removeItem.mutate({ cartId: cart.id, productId })}
      />
    </>
  );
}
