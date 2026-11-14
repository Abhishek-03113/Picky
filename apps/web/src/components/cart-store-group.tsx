import { type CartItem, type CartStoreGroup, formatMoney, pluralize } from "@picky/catalog";
import { CartItemRow } from "./cart-item-row.tsx";

interface CartStoreGroupCardProps {
  group: CartStoreGroup;
  selected: ReadonlySet<string>;
  onToggleSelected: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (item: CartItem) => void;
}

/** One store's items: "Amazon · 3 items", its subtotal per currency, then a row per item. */
export function CartStoreGroupCard({
  group,
  selected,
  onToggleSelected,
  onQuantityChange,
  onRemove,
}: CartStoreGroupCardProps) {
  return (
    <section className="card cart-group" aria-label={group.label}>
      <div className="cart-group-head">
        <h2 className="cart-group-name">{group.label}</h2>
        <span className="subtle">{pluralize(group.items.length, "item")}</span>
        <span className="cart-group-subtotal">
          {group.subtotals.length === 0 ? "Subtotal not listed" : group.subtotals.map(formatMoney).join(" + ")}
        </span>
      </div>
      <ul className="cart-rows">
        {group.items.map((item) => (
          <CartItemRow
            key={item.product.id}
            item={item}
            selected={selected.has(item.product.id)}
            onToggleSelected={() => onToggleSelected(item.product.id)}
            onQuantityChange={(quantity) => onQuantityChange(item.product.id, quantity)}
            onRemove={() => onRemove(item)}
          />
        ))}
      </ul>
    </section>
  );
}
