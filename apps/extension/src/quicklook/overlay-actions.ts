import type { ReadColorOption } from "../link-capture/color-page-reader.ts";
import type { QuickLookView } from "./quicklook-model.ts";

/** What the overlay's controls can ask for; implemented by QuickLookController. */
export interface OverlayActions {
  close(): void;
  select(comparisonId: string): void;
  setView(view: QuickLookView): void;
  removeProduct(productId: string): void;
  addPage(): void;
  retry(): void;
  /** Puts the open page's product in the selected cart (the last-used one before the cart has loaded), or one more of it. */
  addPageToCart(): void;
  selectCart(cartId: string): void;
  /** A quantity below 1 takes the item out of the selected cart. */
  setCartQuantity(productId: string, quantity: number): void;
  retryCart(): void;
  /** Reads a colour the snapshot has no price for, so picking it fills the preview in place; null when unavailable. */
  readonly readColor: ReadColorOption | null;
}
