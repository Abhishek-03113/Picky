/** One in-page toast. `id` identifies a link capture, so "Reading…" is replaced by its result. Plain JSON. */
export type ToastMessage =
  | { kind: "reading"; id: string; title: string; destination: string }
  | {
      kind: "added";
      id: string;
      title: string;
      specCount: number;
      /** Where it went; null for "Library only". */
      placement: { comparisonName: string; count: number } | null;
      undo: { comparisonId: string; productId: string } | null;
    }
  | {
      kind: "cart-added";
      id: string;
      title: string;
      cartName: string;
      /** How many of it the cart holds now. */
      quantity: number;
      /** Undo puts the quantity back to `previousQuantity`, or takes the item out when that is 0. */
      undo: { cartId: string; productId: string; previousQuantity: number };
    }
  | { kind: "failed"; id: string; reason: string };

declare global {
  var pickyToast: ((message: ToastMessage) => void) | undefined;
}

/**
 * The toast's second line: where the product went.
 *
 * @example addedDetail({ specCount: 54, placement: { comparisonName: "Monitors", count: 5 } }) // "54 details · now 5 in Monitors"
 */
export function addedDetail(message: Extract<ToastMessage, { kind: "added" }>): string {
  const details = `${message.specCount} details`;
  if (message.placement === null) return `${details} · saved to Picky`;
  return `${details} · now ${message.placement.count} in ${message.placement.comparisonName}`;
}

/**
 * The cart toast's second line: the product, and how many the cart holds when that is more than one.
 *
 * @example cartAddedDetail({ title: "Dell 27 Monitor", quantity: 2 }) // "Dell 27 Monitor · 2 in your cart"
 */
export function cartAddedDetail(
  message: Pick<Extract<ToastMessage, { kind: "cart-added" }>, "title" | "quantity">,
): string {
  return message.quantity > 1 ? `${message.title} · ${message.quantity} in your cart` : message.title;
}
