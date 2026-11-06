import { supportedStoresText } from "@picky/catalog/sites";
import type { ProductSnapshot } from "@picky/catalog";
import type { ParseProductRequest, ParseProductResponse } from "./offscreen-protocol.ts";
import { IdleReleaser } from "./idle-releaser.ts";
import type { SnapshotReader } from "./snapshot-reader.ts";

// Long enough for a burst of Alt+clicks to share one document, short enough to finish well before Chrome
// stops an idle service worker (whose timer would then never fire).
const IDLE_CLOSE_MS = 15_000;

/**
 * SnapshotReader that parses in a lazily created offscreen document (chrome.offscreen, reason DOM_PARSER).
 * The document is closed again once idle: it is a whole extra page in memory.
 *
 * @example const snapshot = await new ChromeSnapshotReader("offscreen.html").read(html, url)
 */
export class ChromeSnapshotReader implements SnapshotReader {
  private creating: Promise<void> | null = null;
  private readonly lifetime = new IdleReleaser(() => chrome.offscreen.closeDocument(), IDLE_CLOSE_MS);

  constructor(private readonly offscreenPage: string) {}

  read(html: string, url: string): Promise<ProductSnapshot> {
    return this.lifetime.use(() => this.parseInDocument(html, url));
  }

  private async parseInDocument(html: string, url: string): Promise<ProductSnapshot> {
    await this.ensureDocument();
    const request: ParseProductRequest = { target: "offscreen", type: "parse-product", html, url };
    const response: ParseProductResponse | undefined = await chrome.runtime.sendMessage(request);
    if (response === undefined) throw new Error(`Offscreen parser gave no answer for ${url}`);
    if (!response.ok) throw new Error(response.message);
    return response.snapshot;
  }

  private ensureDocument(): Promise<void> {
    // One shared promise: two links added at once must not both try to create the single offscreen document.
    this.creating ??= this.createIfMissing().finally(() => void (this.creating = null));
    return this.creating;
  }

  private async createIfMissing(): Promise<void> {
    const existing = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    if (existing.length > 0) return;
    await chrome.offscreen.createDocument({
      url: this.offscreenPage,
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: `Parse fetched ${supportedStoresText()} product pages without opening them`,
    });
  }
}
