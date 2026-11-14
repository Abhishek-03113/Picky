import type { CatalogProduct, Money } from "../product-snapshot.ts";

/** One product in a cart, with how many the shopper intends to buy. */
export interface CartItem {
  product: CatalogProduct;
  /** 1 to 99. */
  quantity: number;
  /** The shopper's private note; never shown on a shared cart. */
  note: string | null;
  /** The price when the item was added, to show "less than when you added it". */
  priceWhenAdded: Money | null;
  /** ISO 8601 date-time. */
  addedAt: string;
}

/** A cart as lists and "is it in a cart?" checks show it. */
export interface CatalogCartSummary {
  id: string;
  name: string;
  /** Product id and quantity per item, in position order. */
  items: { productId: string; quantity: number }[];
  /** The live share slug, or null when the cart is not shared. */
  shareSlug: string | null;
  updatedAt: string;
}

/** A cart with its products in full, in position order (the cart page and the extension's Cart tab). */
export interface CatalogCartDetail {
  id: string;
  name: string;
  items: CartItem[];
  shareSlug: string | null;
  updatedAt: string;
}

/** One line of a shared cart: only what a stranger with the link may see. */
export interface SharedCartItem {
  source: string;
  externalId: string;
  title: string;
  url: string;
  image: string | null;
  price: Money | null;
  availability: string | null;
  variant: string | null;
  quantity: number;
}

/** What GET /api/shared-carts/:slug returns. No owner details, no notes. */
export interface SharedCartView {
  slug: string;
  name: string;
  items: SharedCartItem[];
  updatedAt: string;
}

/** One recorded price of a product. */
export interface PriceObservation {
  price: Money;
  listPrice: Money | null;
  availability: string | null;
  /** ISO 8601 date-time. */
  observedAt: string;
}

/** A product's price history, oldest first, as GET /api/products/:id/prices returns it. */
export interface PriceHistory {
  productId: string;
  observations: PriceObservation[];
}

/** Body of PUT /api/carts/:id/items/:productId. Omitted fields keep their value; quantity defaults to 1 on add. */
export interface CartItemInput {
  quantity?: number;
  note?: string | null;
}
