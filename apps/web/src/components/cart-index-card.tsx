import { pluralize, type CatalogCartSummary } from "@picky/catalog";
import { Link } from "@tanstack/react-router";
import { formatUpdatedLabel } from "../format/format-relative-date.ts";

interface CartIndexCardProps {
  cart: CatalogCartSummary;
  /** Injected so the "Updated today" label is deterministic in tests. */
  now: Date;
}

/**
 * One cart on the carts index: name, item count and last change, opening the cart.
 *
 * @example <CartIndexCard cart={summary} now={new Date()} />
 */
export function CartIndexCard({ cart, now }: CartIndexCardProps) {
  return (
    <Link to="/carts/$cartId" params={{ cartId: cart.id }} className="card comparison-index-card">
      <span className="comparison-index-name">{cart.name}</span>
      <span className="subtle">{`${pluralize(cart.items.length, "item")} · ${formatUpdatedLabel(cart.updatedAt, now)}`}</span>
    </Link>
  );
}
