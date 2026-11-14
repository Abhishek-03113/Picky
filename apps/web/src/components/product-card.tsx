import { type CatalogProductSummary, formatMoney, sourceLabel } from "@picky/catalog";
import { Link } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { formatCapturedLabel } from "../format/format-relative-date.ts";
import { AddToCartButton } from "./add-to-cart-button.tsx";
import { BoxIcon, CheckIcon } from "./icons.tsx";

interface ProductCardProps {
  product: CatalogProductSummary;
  /** Injected so "Saved today" is deterministic in tests. */
  now: Date;
  /** Present in the library: a checkbox circle on the card, and card clicks select once anything is selected. */
  selection?: CardSelection;
}

export interface CardSelection {
  /** True while at least one product is selected: the card then toggles instead of opening. */
  active: boolean;
  selected: boolean;
  onToggle: () => void;
}

/** One product in the library, linking to its spec sheet, with "Add to cart" under it. */
export function ProductCard({ product, now, selection }: ProductCardProps) {
  return (
    <div className={selection?.selected === true ? "card-frame with-cart selected" : "card-frame with-cart"}>
      <CardLink product={product} now={now} selection={selection} />
      {selection !== undefined && <SelectionTick title={product.title} selection={selection} />}
      {/* Outside the card link: a button inside a link would open the product instead. */}
      <div className="product-card-actions">
        <AddToCartButton productId={product.id} title={product.title} />
      </div>
    </div>
  );
}

function SelectionTick({ title, selection }: { title: string; selection: CardSelection }) {
  return (
    <label className="card-tick">
      <input
        type="checkbox"
        className="visually-hidden"
        checked={selection.selected}
        aria-label={`Select ${title}`}
        onChange={selection.onToggle}
      />
      <span aria-hidden="true" className="card-tick-circle">
        {selection.selected && <CheckIcon size={15} />}
      </span>
    </label>
  );
}

function CardLink({ product, now, selection }: ProductCardProps) {
  const toggleInsteadOfOpen = (event: MouseEvent) => {
    if (selection?.active !== true) return;
    event.preventDefault();
    selection.onToggle();
  };
  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className="product-card"
      onClick={toggleInsteadOfOpen}
    >
      <span className="product-card-image">
        {product.imageUrl === null ? <BoxIcon size={56} /> : <img src={product.imageUrl} alt="" loading="lazy" />}
      </span>
      <CardBody product={product} now={now} />
    </Link>
  );
}

function CardBody({ product, now }: Pick<ProductCardProps, "product" | "now">) {
  return (
    <span className="product-card-body">
      <span className="product-card-top">
        <span className="product-card-brand">{product.brand ?? "Brand not listed"}</span>
        <span className="chip">{sourceLabel(product.source)}</span>
      </span>
      <span className="product-card-title">{product.title}</span>
      <span className="product-card-price">
        {product.price === null ? <span className="muted">Price not shown</span> : formatMoney(product.price)}
      </span>
      <span className="product-card-date">{formatCapturedLabel(product.updatedAt, now)}</span>
    </span>
  );
}
