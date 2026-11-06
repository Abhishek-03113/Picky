import type { BadgeState, BrowserPort } from "./browser-port.ts";
import type { CaptureResult } from "./capture-result.ts";

const BADGES: Readonly<Record<BadgeState, { text: string; color: string }>> = {
  working: { text: "…", color: "#5f6b66" },
  done: { text: "✓", color: "#0f6b5c" },
  failed: { text: "!", color: "#b0302a" },
  unsupported: { text: "?", color: "#9a5b00" },
};

/**
 * BrowserPort over the chrome.* extension APIs.
 *
 * @example runCaptureFlow(tab, { browser: new ChromeBrowserPort("page-capture.js"), … })
 */
export class ChromeBrowserPort implements BrowserPort {
  constructor(private readonly captureScriptFile: string) {}

  async capturePageInTab(tabId: number): Promise<CaptureResult> {
    // A page captured before already has the capture function; only inject the bundle the first time.
    const earlier = await this.runCapture(tabId);
    if (earlier !== null) return earlier;
    await chrome.scripting.executeScript({ target: { tabId }, files: [this.captureScriptFile] });
    return (await this.runCapture(tabId)) ?? { ok: false, message: "Picky capture script did not load" };
  }

  /** Calls the capture function injected into this tab, or returns null when the tab does not have it yet. */
  private async runCapture(tabId: number): Promise<CaptureResult | null> {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => globalThis.pickyCapturePage?.() ?? null,
    });
    return (injection?.result as CaptureResult | null | undefined) ?? null;
  }

  async openTab(url: string): Promise<void> {
    await chrome.tabs.create({ url });
  }

  async showBadge(tabId: number, state: BadgeState): Promise<void> {
    await chrome.action.setBadgeText({ tabId, text: BADGES[state].text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGES[state].color });
  }
}
