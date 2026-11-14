import type { CatalogCartSummary } from "@picky/catalog";
import { useState } from "react";
import { uniqueComparisonName } from "../comparison/comparison-labels.ts";
import { DEFAULT_CART_NAME, useAddToCart, type CartTarget } from "../hooks/use-cart-mutations.ts";
import { CartNameForm } from "./cart-name-form.tsx";
import { MenuPopover } from "./menu-popover.tsx";

interface CartChooserProps {
  carts: readonly CatalogCartSummary[];
  productIds: readonly string[];
  /** Below on cards and pages; above in the selection bar at the bottom of the screen. */
  placement?: "below" | "above";
  triggerClassName: string;
  /** Called with the cart's name once every product is in it. */
  onAdded?: (cartName: string) => void;
}

/**
 * "Add to cart": straight into the only cart (or a new "Cart" when there is none); with several carts, a
 * menu of every cart plus "New cart…", which asks for a name in place.
 *
 * @example <CartChooser carts={carts} productIds={[product.id]} triggerClassName="add-to-cart-button" />
 */
export function CartChooser({ carts, productIds, placement = "below", triggerClassName, onAdded }: CartChooserProps) {
  const [naming, setNaming] = useState(false);
  const addToCart = useAddToCart();
  const add = (target: CartTarget, cartName: string) =>
    addToCart.mutate(
      { target, productIds },
      {
        onSuccess: () => {
          setNaming(false);
          onAdded?.(cartName);
        },
      },
    );
  if (naming) {
    return (
      <CartNameForm
        initialName={uniqueComparisonName(DEFAULT_CART_NAME, carts.map((cart) => cart.name))}
        isPending={addToCart.isPending}
        errorMessage={addToCart.isError ? addToCart.error.message : null}
        onCreate={(name) => add({ newCartName: name }, name)}
        onCancel={() => setNaming(false)}
      />
    );
  }
  return (
    <>
      <CartChooserTrigger
        carts={carts}
        placement={placement}
        triggerClassName={triggerClassName}
        isPending={addToCart.isPending}
        onAddTo={(cart) => add({ cartId: cart.id }, cart.name)}
        onAddToNew={() => add({ newCartName: DEFAULT_CART_NAME }, DEFAULT_CART_NAME)}
        onNameNew={() => setNaming(true)}
      />
      {addToCart.isError && (
        <p className="form-error" role="alert">
          {addToCart.error.message}
        </p>
      )}
    </>
  );
}

interface CartChooserTriggerProps {
  carts: readonly CatalogCartSummary[];
  placement: "below" | "above";
  triggerClassName: string;
  isPending: boolean;
  onAddTo: (cart: CatalogCartSummary) => void;
  onAddToNew: () => void;
  onNameNew: () => void;
}

function CartChooserTrigger({
  carts,
  placement,
  triggerClassName,
  isPending,
  onAddTo,
  onAddToNew,
  onNameNew,
}: CartChooserTriggerProps) {
  const [onlyCart] = carts;
  if (carts.length <= 1) {
    return (
      <button
        type="button"
        className={triggerClassName}
        disabled={isPending}
        onClick={() => (onlyCart === undefined ? onAddToNew() : onAddTo(onlyCart))}
      >
        {isPending ? "Adding…" : "Add to cart"}
      </button>
    );
  }
  return (
    <MenuPopover label="Add to cart" triggerClassName={triggerClassName} trigger="Add to cart…" placement={placement}>
      {(close) => (
        <>
          {carts.map((cart) => (
            <CartMenuEntry key={cart.id} onPick={() => onAddTo(cart)} close={close}>
              {cart.name}
            </CartMenuEntry>
          ))}
          <CartMenuEntry accent onPick={onNameNew} close={close}>
            New cart…
          </CartMenuEntry>
        </>
      )}
    </MenuPopover>
  );
}

interface CartMenuEntryProps {
  onPick: () => void;
  close: () => void;
  accent?: boolean;
  children: string;
}

function CartMenuEntry({ onPick, close, accent = false, children }: CartMenuEntryProps) {
  const pick = () => {
    onPick();
    close();
  };
  return (
    <button type="button" role="menuitem" className={accent ? "menu-item accent" : "menu-item"} onClick={pick}>
      {children}
    </button>
  );
}
