import { describeSupportedProductUrls, isSupportedProductUrl, type ProductSnapshot } from "@picky/catalog";
import type { CaptureResult } from "../capture-result.ts";
import type { ComparisonsClient } from "../comparisons/comparisons-client.ts";
import { noStoreAccessMessage } from "../failure-hint.ts";
import type { PermissionRetry } from "../permissions/store-access-service.ts";
import type { StoreAccess } from "../permissions/store-permissions.ts";
import { comparisonNameFor } from "../snapshot-category.ts";
import type { ToastMessage } from "../toast/toast-message.ts";
import type { ToastPort } from "../toast/toast-port.ts";
import type { AddTarget } from "./add-target.ts";
import type { BadgeCounter } from "./badge-counter.ts";
import type { HtmlFetcher } from "./html-fetcher.ts";
import { titleFromProductUrl } from "./product-link.ts";
import type { SnapshotReader } from "./snapshot-reader.ts";

export interface LinkCaptureDependencies {
  fetcher: HtmlFetcher;
  /** Parses downloaded page HTML into a snapshot. */
  reader: SnapshotReader;
  /** Reads the product from an open tab's live DOM. */
  capturePage: (tabId: number) => Promise<CaptureResult>;
  sendSnapshot: (snapshot: ProductSnapshot) => Promise<string>;
  /** Opens Quick Look in a tab on a product that is not that tab's page. */
  showQuickLook: (tabId: number, snapshot: ProductSnapshot) => Promise<void>;
  comparisons: ComparisonsClient;
  settings: {
    lastComparisonId(): Promise<string | null>;
    setLastComparisonId(id: string): Promise<void>;
  };
  toasts: ToastPort;
  badge: BadgeCounter;
  newToastId: () => string;
  onComparisonsChanged: () => void;
  log: (event: string, fields: Record<string, string | number>) => void;
  /**
   * Whether a link's store may be downloaded (beta stores need the shopper's OK first). Absent: every
   * store is allowed, as for required stores.
   */
  access?: { forUrl(url: string): Promise<StoreAccess> };
  /** Told when the open page was saved, so its Save pill turns to "Saved". */
  onPageSaved?: (url: string, productId: string) => Promise<void>;
}

export interface LinkAddJob {
  url: string;
  /** Link text for the "Reading …" toast; empty falls back to the URL slug. */
  label: string;
  target: AddTarget;
  /** The tab to show toasts in; null shows none. */
  tabId: number | null;
  /** "page": `url` is open in `tabId`, so its live DOM is read; "link": the page is downloaded and parsed here. */
  source: "link" | "page";
}

interface CapturedProduct {
  productId: string;
  snapshot: ProductSnapshot;
}

interface Placement {
  comparisonId: string;
  comparisonName: string;
  count: number;
}

/**
 * "Add to Picky" from the context menu or Alt+click: read the product (the open page's DOM, or a link
 * downloaded with the user's cookies and parsed in the extension) → save → add to a comparison, with toasts
 * and a toolbar badge while it runs. Failures end in an error toast and never throw.
 *
 * @example await new LinkCaptureService(deps).add({ url, label, target: { kind: "last" }, tabId: 7 })
 */
export class LinkCaptureService {
  constructor(private readonly deps: LinkCaptureDependencies) {}

  /** Resolves to the saved product's id, or null when nothing was saved (the toast says why). */
  async add(job: LinkAddJob): Promise<string | null> {
    const id = this.deps.newToastId();
    if (!isSupportedProductUrl(job.url)) {
      await this.rejectLink(job.url, job.tabId, id);
      return null;
    }
    // The open page is read through activeTab or the store's content script; only downloads need access.
    if (job.source === "link") {
      const retry: PermissionRetry = { action: "add", url: job.url, label: job.label };
      if (!(await this.checkAccess(job.url, job.tabId, id, retry))) return null;
    }
    await this.deps.badge.begin();
    await this.deps.toasts.show(job.tabId, {
      kind: "reading",
      id,
      title: job.label === "" ? titleFromProductUrl(job.url) : job.label,
      destination: describeTarget(job.target),
    });
    try {
      const { productId, toast } = await this.captureAndPlace(job, id);
      await this.deps.toasts.show(job.tabId, toast);
      return productId;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.deps.log("link_capture.failed", { url: job.url, reason });
      await this.deps.toasts.show(job.tabId, { kind: "failed", id, reason });
      return null;
    } finally {
      await this.deps.badge.end();
    }
  }

  /**
   * True when the link's store may be downloaded. Otherwise shows the "Allow Picky on <Store>" toast (or,
   * after a "Not now", a quiet notice) and resolves to false.
   */
  private async checkAccess(url: string, tabId: number | null, id: string, retry: PermissionRetry): Promise<boolean> {
    const access: StoreAccess = (await this.deps.access?.forUrl(url)) ?? { kind: "allowed" };
    if (access.kind === "allowed") return true;
    this.deps.log("link_capture.store_access", { url, source: access.site.source, access: access.kind });
    const { source, label } = access.site;
    await this.deps.toasts.show(
      tabId,
      access.kind === "ask"
        ? { kind: "permission", id, source, storeLabel: label, retry }
        : { kind: "failed", id, reason: noStoreAccessMessage(label) },
    );
    return false;
  }

  /** Refuses before any network request: the menu patterns are coarse and an Alt+click target is page-controlled. */
  private async rejectLink(url: string, tabId: number | null, id: string): Promise<void> {
    const reason = `"${url}" is not a product link; expected ${describeSupportedProductUrls()}`;
    this.deps.log("link_capture.rejected", { url });
    await this.deps.toasts.show(tabId, { kind: "failed", id, reason });
  }

  /**
   * Saves a product link to the library only, with no toasts or badge (the web app's paste-a-link), and
   * returns the stored product's id. Throws on unsupported links and failed fetches, parses or saves.
   */
  async importLink(url: string): Promise<string> {
    if (!isSupportedProductUrl(url)) {
      throw new Error(`"${url}" is not a product link; expected ${describeSupportedProductUrls()}`);
    }
    const access: StoreAccess = (await this.deps.access?.forUrl(url)) ?? { kind: "allowed" };
    if (access.kind !== "allowed") throw new Error(noStoreAccessMessage(access.site.label));
    const { productId, snapshot } = await this.readLink(url);
    this.deps.log("link_capture.imported", { url, productId, externalId: snapshot.externalId });
    return productId;
  }

  /**
   * "Quick Look" on a link: download and parse it, then show its specs over the current page without
   * saving anything. The badge counts while it runs; a failure ends in an error toast and never throws.
   */
  async quickLook(url: string, tabId: number): Promise<void> {
    if (!isSupportedProductUrl(url)) return this.rejectLink(url, tabId, this.deps.newToastId());
    const retry: PermissionRetry = { action: "quicklook", url, label: "" };
    if (!(await this.checkAccess(url, tabId, this.deps.newToastId(), retry))) return;
    await this.deps.badge.begin();
    try {
      const snapshot = await this.deps.reader.read(await this.deps.fetcher.fetchHtml(url), url);
      await this.deps.showQuickLook(tabId, snapshot);
      this.deps.log("link_capture.quicklook", { url, externalId: snapshot.externalId });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.deps.log("link_capture.quicklook_failed", { url, reason });
      await this.deps.toasts.show(tabId, { kind: "failed", id: this.deps.newToastId(), reason });
    } finally {
      await this.deps.badge.end();
    }
  }

  /** Removes a just-added product again (the toast's Undo). */
  async undo(comparisonId: string, productId: string): Promise<void> {
    await this.deps.comparisons.removeProduct(comparisonId, productId);
    this.deps.onComparisonsChanged();
  }

  private async captureAndPlace(job: LinkAddJob, id: string): Promise<{ productId: string; toast: ToastMessage }> {
    const { productId, snapshot } = await this.capture(job);
    if (job.source === "page") await this.deps.onPageSaved?.(job.url, productId);
    const placement = await this.place(productId, snapshot, job.target);
    this.deps.log("link_capture.added", {
      url: job.url,
      source: job.source,
      productId,
      externalId: snapshot.externalId,
    });
    const toast: ToastMessage = {
      kind: "added",
      id,
      title: snapshot.title,
      specCount: snapshot.specGroups.reduce((total, group) => total + group.specs.length, 0),
      placement: placement === null ? null : { comparisonName: placement.comparisonName, count: placement.count },
      undo: placement === null ? null : { comparisonId: placement.comparisonId, productId },
    };
    return { productId, toast };
  }

  private async capture(job: LinkAddJob): Promise<CapturedProduct> {
    if (job.source === "link") return this.readLink(job.url);
    if (job.tabId === null) throw new Error(`Cannot read ${job.url}: no tab to capture it from`);
    const result = await this.deps.capturePage(job.tabId);
    if (!result.ok) throw new Error(result.message);
    return { productId: await this.deps.sendSnapshot(result.snapshot), snapshot: result.snapshot };
  }

  private async readLink(url: string): Promise<CapturedProduct> {
    const snapshot = await this.deps.reader.read(await this.deps.fetcher.fetchHtml(url), url);
    return { productId: await this.deps.sendSnapshot(snapshot), snapshot };
  }

  private async place(productId: string, snapshot: ProductSnapshot, target: AddTarget): Promise<Placement | null> {
    if (target.kind === "library") return null;
    const comparisonId = await this.resolveComparison(productId, snapshot, target);
    await this.deps.settings.setLastComparisonId(comparisonId);
    this.deps.onComparisonsChanged();
    const detail = await this.deps.comparisons.get(comparisonId);
    return { comparisonId, comparisonName: detail.name, count: detail.products.length };
  }

  private async resolveComparison(productId: string, snapshot: ProductSnapshot, target: AddTarget): Promise<string> {
    const existingId = await this.existingComparisonId(target);
    if (existingId === null) {
      const created = await this.deps.comparisons.create(comparisonNameFor(snapshot, "New comparison"), [productId]);
      return created.id;
    }
    await this.deps.comparisons.addProduct(existingId, productId);
    return existingId;
  }

  private async existingComparisonId(target: AddTarget): Promise<string | null> {
    if (target.kind === "comparison") return target.comparisonId;
    if (target.kind === "new") return null;
    const all = await this.deps.comparisons.list();
    const lastUsed = await this.deps.settings.lastComparisonId();
    return (all.find((comparison) => comparison.id === lastUsed) ?? all[0])?.id ?? null;
  }
}

function describeTarget(target: AddTarget): string {
  if (target.kind === "library") return "Saved";
  return target.kind === "new" ? "a new comparison" : "your comparison";
}
