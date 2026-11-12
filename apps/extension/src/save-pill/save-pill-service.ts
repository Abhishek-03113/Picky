import type { CartService } from "../carts/cart-service.ts";
import type { LinkCaptureService } from "../link-capture/link-capture-service.ts";
import type { PageMarks } from "./page-marks.ts";

export interface SavePillDependencies {
  marks: Pick<PageMarks, "get" | "set">;
  linkCapture: Pick<LinkCaptureService, "add">;
  cart: Pick<CartService, "addProduct">;
  log: (event: string, fields: Record<string, string | number>) => void;
}

/**
 * The worker's side of the Save pill. "Save to Picky" takes the same path as the right-click "Save to
 * Picky" on a page (read the open tab's DOM, save, toast); the pill follows through page marks in
 * chrome.storage.local, which LinkCaptureService's onPageSaved turns to "Saved".
 *
 * @example await new SavePillService(deps).save("https://www.walmart.com/ip/1", "Desk lamp", 7)
 */
export class SavePillService {
  constructor(private readonly deps: SavePillDependencies) {}

  async save(url: string, title: string, tabId: number | null): Promise<void> {
    await this.deps.marks.set(url, { state: "reading", since: Date.now() });
    const productId = await this.deps.linkCapture.add({
      url,
      label: title,
      target: { kind: "library" },
      tabId,
      source: "page",
    });
    if (productId === null) await this.deps.marks.set(url, null);
  }

  /**
   * "Add to cart" on a saved page: one more of the product in the last-used cart. Rejects with the reason
   * (signed out, API down) so the pill can say what happened.
   */
  async addToCart(url: string, productId: string): Promise<void> {
    const placement = await this.deps.cart.addProduct(null, productId);
    await this.deps.marks.set(url, { state: "saved", productId, cartQuantity: placement.quantity });
    this.deps.log("save_pill.added_to_cart", { url, productId, quantity: placement.quantity });
  }

  /** Records a page saved by any path (pill, right-click), keeping its cart quantity. */
  async pageSaved(url: string, productId: string): Promise<void> {
    const previous = await this.deps.marks.get(url);
    const cartQuantity = previous?.state === "saved" && previous.productId === productId ? previous.cartQuantity : 0;
    await this.deps.marks.set(url, { state: "saved", productId, cartQuantity });
  }
}
