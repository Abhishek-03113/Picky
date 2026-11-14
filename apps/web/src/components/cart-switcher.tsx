import type { CatalogCartSummary } from "@picky/catalog";
import { Link } from "@tanstack/react-router";
import { ChevronDownIcon } from "./icons.tsx";
import { MenuPopover } from "./menu-popover.tsx";

interface CartSwitcherProps {
  carts: readonly CatalogCartSummary[];
  currentCartId: string;
}

/** "All carts" menu above the cart title: every cart with its item count (the open one marked), then the index. */
export function CartSwitcher({ carts, currentCartId }: CartSwitcherProps) {
  return (
    <MenuPopover
      label="Carts"
      triggerClassName="cart-switcher"
      trigger={
        <>
          All carts
          <ChevronDownIcon size={14} />
        </>
      }
    >
      {(close) => (
        <>
          {carts.map((cart) => (
            <Link
              key={cart.id}
              to="/carts/$cartId"
              params={{ cartId: cart.id }}
              role="menuitem"
              className="menu-item cart-switcher-item"
              aria-current={cart.id === currentCartId ? "page" : undefined}
              onClick={close}
            >
              <span className="side-link-name">{cart.name}</span>
              <span className="side-link-count">{cart.items.length}</span>
            </Link>
          ))}
          <Link to="/carts" role="menuitem" className="menu-item accent" onClick={close}>
            See all carts
          </Link>
        </>
      )}
    </MenuPopover>
  );
}
