import { describeSupportedProductUrls, isSupportedProductUrl, type ProductSnapshot } from "@picky/catalog";
import type { CaptureResult } from "../capture-result.ts";
import type { BadgeCounter } from "../link-capture/badge-counter.ts";
import type { HtmlFetcher } from "../link-capture/html-fetcher.ts";
import { titleFromProductUrl } from "../link-capture/product-link.ts";
import type { SnapshotReader } from "../link-capture/snapshot-reader.ts";
import type { ToastMessage } from "../toast/toast-message.ts";
import type { ToastPort } from "../toast/toast-port.ts";
import type { CartService } from "./cart-service.ts";

export interface CartCaptureDependencies {
  fetcher: HtmlFetcher;
  /** Parses downloaded page HTML into a snapshot. */
  reader: SnapshotReader;
  /** Reads the product from an open tab's live DOM. */
  capturePage: (tabId: number) => Promise<CaptureResult>;
  sendSnapshot: (snapshot: ProductSnapshot) => Promise<string>;
  cart: Pick<CartService, "addProduct">;
  toasts: ToastPort;
  badge: BadgeCounter;
  newToastId: () => string;
  log: (event: string, fields: Record<string, string | number>) => void;
}

export interface CartAddJob {
  url: string;
  /** Page title for the "Saving …" toast; empty falls back to the URL slug. */
  label: string;
  /** The tab to show toasts in; null shows none. */
  tabId: number | null;
  /** "page": `url` is open in `tabId`, so its live DOM is read; "link": the page is downloaded and parsed here. */
  source: "link" | "page";
}

/**
 * "Add to cart" from the right-click menu: read the product (the open page's DOM, or a link downloaded and
 * parsed in the extension) → save → put it in the last-used cart (one more when it is already there), then a
 * toast "Added to <cart>" with Undo and Open cart. Failures end in an error toast and never throw.
 *
 * @example await new CartCaptureService(deps).add({ url, label: tab.title, tabId: 7, source: "page" })
 */
export class CartCaptureService {
  constructor(private readonly deps: CartCaptureDependencies) {}

  async add(job: CartAddJob): Promise<void> {
    const id = this.deps.newToastId();
    if (!isSupportedProductUrl(job.url)) return this.rejectLink(job.url, job.tabId, id);
    await this.deps.badge.begin();
    await this.deps.toasts.show(job.tabId, {
      kind: "reading",
      id,
      title: job.label === "" ? titleFromProductUrl(job.url) : job.label,
      destination: "your cart",
    });
    try {
      await this.deps.toasts.show(job.tabId, await this.captureAndAdd(job, id));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.deps.log("cart_capture.failed", { url: job.url, reason });
      await this.deps.toasts.show(job.tabId, { kind: "failed", id, reason });
    } finally {
      await this.deps.badge.end();
    }
  }

  /** Refuses before any network request: the menu patterns are coarse. */
  private async rejectLink(url: string, tabId: number | null, id: string): Promise<void> {
    const reason = `"${url}" is not a product link; expected ${describeSupportedProductUrls()}`;
    this.deps.log("cart_capture.rejected", { url });
    await this.deps.toasts.show(tabId, { kind: "failed", id, reason });
  }

  private async captureAndAdd(job: CartAddJob, id: string): Promise<ToastMessage> {
    const snapshot = await this.read(job);
    const placement = await this.deps.cart.addProduct(null, await this.deps.sendSnapshot(snapshot));
    this.deps.log("cart_capture.added", {
      url: job.url,
      source: job.source,
      cartId: placement.cart.id,
      productId: placement.productId,
      quantity: placement.quantity,
    });
    return {
      kind: "cart-added",
      id,
      title: snapshot.title,
      cartName: placement.cart.name,
      quantity: placement.quantity,
      undo: { cartId: placement.cart.id, productId: placement.productId, previousQuantity: placement.previousQuantity },
    };
  }

  private async read(job: CartAddJob): Promise<ProductSnapshot> {
    if (job.source === "link") return this.deps.reader.read(await this.deps.fetcher.fetchHtml(job.url), job.url);
    if (job.tabId === null) throw new Error(`Cannot read ${job.url}: no tab to capture it from`);
    const result = await this.deps.capturePage(job.tabId);
    if (!result.ok) throw new Error(result.message);
    return result.snapshot;
  }
}
