import {
  type CartItem,
  type Money,
  cartSavings,
  cartTotals,
  formatMoney,
  isUnavailable,
  pluralize,
} from "@picky/catalog";
import { Link } from "@tanstack/react-router";

interface CartSummaryCardProps {
  cartId: string;
  items: readonly CartItem[];
}

/**
 * The cart's right column: one total per currency, savings against list price, what is left out, and
 * a full-width Checkout link.
 */
export function CartSummaryCard({ cartId, items }: CartSummaryCardProps) {
  const { totals, unpricedCount, unavailableCount } = cartTotals(items);
  const { againstListPrice, sinceAdded } = cartSavings(items);
  return (
    <aside className="card cart-summary" aria-label="Summary">
      <h2 className="cart-summary-title">Summary</h2>
      {totals.length === 0 && <p className="subtle">No prices listed yet.</p>}
      {totals.map((total) => (
        <p key={total.currency} className="cart-summary-line">
          <span>{`Items in ${currencySymbol(total.currency)} (${pricedLineCount(items, total.currency)})`}</span>
          <strong>{formatMoney(total)}</strong>
        </p>
      ))}
      <SavingLines amounts={againstListPrice} label="Saved against list price" />
      <SavingLines amounts={sinceAdded} label="Less than when you added it" />
      {unavailableCount > 0 && (
        <p className="hint">{`${pluralize(unavailableCount, "item")} out of stock, left out of the total.`}</p>
      )}
      {unpricedCount > 0 && (
        <p className="hint">{`${pluralize(unpricedCount, "item")} with no price listed, not counted.`}</p>
      )}
      <p className="hint">
        Totals are kept per currency and are never converted. Items total, before delivery and tax.
      </p>
      <Link to="/carts/$cartId/checkout" params={{ cartId }} className="primary-button cart-checkout">
        Checkout
      </Link>
    </aside>
  );
}

function SavingLines({ amounts, label }: { amounts: readonly Money[]; label: string }) {
  return amounts.map((amount) => (
    <p key={amount.currency} className="cart-summary-line cart-saving">
      <span>{label}</span>
      <span>{formatMoney(amount)}</span>
    </p>
  ));
}

/** In-stock lines priced in `currency`: the lines that make up that total. */
function pricedLineCount(items: readonly CartItem[], currency: string): number {
  return items.filter((item) => !isUnavailable(item) && item.product.snapshot.price?.currency === currency).length;
}

/**
 * The sign shoppers read for a currency: "₹" for INR, "$" for USD; the code itself when there is none.
 *
 * @example currencySymbol("INR") // "₹"
 */
function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat("en-IN", { style: "currency", currency }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? currency;
}
