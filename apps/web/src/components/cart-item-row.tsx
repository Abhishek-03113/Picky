import {
  type CartItem,
  discountPercent,
  formatCaptureTime,
  formatMoney,
  isUnavailable,
  lineTotal,
} from "@picky/catalog";
import { Link } from "@tanstack/react-router";
import { CartQuantityStepper } from "./cart-quantity-stepper.tsx";
import { BoxIcon } from "./icons.tsx";
import { PriceTrend } from "./price-trend.tsx";

interface CartItemRowProps {
  item: CartItem;
  selected: boolean;
  onToggleSelected: () => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

/** One cart line: tick, photo, title (to its details), variant, price date, stepper, line price, Remove. */
export function CartItemRow({ item, selected, onToggleSelected, onQuantityChange, onRemove }: CartItemRowProps) {
  const { product } = item;
  const { snapshot } = product;
  const image = snapshot.images[0];
  const unavailable = isUnavailable(item);
  return (
    <li className={unavailable ? "cart-row is-unavailable" : "cart-row"}>
      <label className="cart-row-tick">
        <input type="checkbox" checked={selected} aria-label={`Select ${snapshot.title}`} onChange={onToggleSelected} />
      </label>
      <span className="cart-row-photo">
        {image === undefined ? <BoxIcon size={32} /> : <img src={image} alt="" loading="lazy" />}
      </span>
      <div className="cart-row-text">
        <Link to="/products/$productId" params={{ productId: product.id }} className="cart-row-title">
          {snapshot.title}
        </Link>
        {snapshot.variant !== null && <span className="cart-row-variant">{snapshot.variant}</span>}
        <span className="cart-row-date">Price as of {formatCaptureTime(snapshot.capturedAt)}</span>
        {unavailable && <span className="cart-row-unavailable">Out of stock. Left out of checkout.</span>}
        <div className="cart-row-controls">
          <CartQuantityStepper quantity={item.quantity} title={snapshot.title} onChange={onQuantityChange} />
          <button type="button" className="text-button cart-row-remove" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      <div className="cart-row-price">
        <LinePrice item={item} />
        <PriceTrend productId={product.id} priceWhenAdded={item.priceWhenAdded} addedAt={item.addedAt} />
      </div>
    </li>
  );
}

/** Quantity × price, "₹1,200 each" when there are several, and the struck list price when discounted. */
function LinePrice({ item }: { item: CartItem }) {
  const { price, listPrice } = item.product.snapshot;
  const line = lineTotal(item);
  if (price === null || line === null) return <span className="muted">Price not listed</span>;
  const discounted = discountPercent(price, listPrice) !== null && listPrice !== null;
  return (
    <>
      <span className="cart-row-line">{formatMoney(line)}</span>
      {discounted && (
        <s className="cart-row-list">{formatMoney({ ...listPrice, amount: listPrice.amount * item.quantity })}</s>
      )}
      {item.quantity > 1 && <span className="cart-row-each">{formatMoney(price)} each</span>}
    </>
  );
}
