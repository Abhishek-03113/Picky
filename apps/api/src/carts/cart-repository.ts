import type {
  CartItemInput,
  CatalogCartDetail,
  CatalogCartSummary,
  ProductSnapshot,
  SharedCartView,
} from "@picky/catalog";

/** The name of the cart every user gets on first use. */
export const DEFAULT_CART_NAME = "My cart";

/** One line to merge into a cart: an existing line keeps the higher quantity. */
export interface CartMergeLine {
  productId: string;
  quantity: number;
  note: string | null;
}

/** How many lines a merge added as new and how many it folded into lines already there. */
export interface CartMergeResult {
  added: number;
  merged: number;
}

/** A shared cart's line with the full snapshot, for copying it into another user's library. */
export interface SharedCartLine {
  snapshot: ProductSnapshot;
  quantity: number;
}

/**
 * Storage for carts, each owned by one user, and their public share links. Every method except the
 * `findShared*` ones is scoped to `userId`: another user's cart resolves exactly like a missing one
 * (null), so ids never leak across accounts. Callers check a product is the user's own before adding it.
 */
export interface CartRepository {
  /** Most recently updated first. A user with no cart gets one named "My cart", so the list is never empty. */
  listCarts(userId: string): Promise<CatalogCartSummary[]>;
  createCart(userId: string, name: string): Promise<CatalogCartSummary>;
  findCart(userId: string, id: string): Promise<CatalogCartDetail | null>;
  renameCart(userId: string, id: string, name: string): Promise<CatalogCartSummary | null>;
  /** True when a cart was deleted. Its products stay in the library; its share link stops working. */
  deleteCart(userId: string, id: string): Promise<boolean>;
  /**
   * Adds the product (quantity defaults to 1, appended at the end, price recorded from its snapshot) or
   * updates the given fields of the line already there. Null when the cart or product is not the user's.
   */
  putItem(userId: string, id: string, productId: string, input: CartItemInput): Promise<CatalogCartSummary | null>;
  removeItem(userId: string, id: string, productId: string): Promise<CatalogCartSummary | null>;
  /** Adds lines in order; a product already in the cart keeps the higher quantity. Null for an unknown cart. */
  mergeItems(userId: string, id: string, lines: readonly CartMergeLine[]): Promise<CartMergeResult | null>;
  /** The cart's live share slug, created when it has none. Null for an unknown cart. */
  createShare(userId: string, id: string): Promise<string | null>;
  /** Revokes the live share, if any. False only for an unknown cart. */
  revokeShare(userId: string, id: string): Promise<boolean>;
  /** The live, owner-free view of a shared cart; null when the slug is unknown or revoked. */
  findSharedCart(slug: string): Promise<SharedCartView | null>;
  /** The shared cart's name and lines with full snapshots; null when the slug is unknown or revoked. */
  findSharedCartLines(slug: string): Promise<{ name: string; lines: SharedCartLine[] } | null>;
}
