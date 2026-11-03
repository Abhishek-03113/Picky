import type { ProductSnapshot } from "@picky/catalog";
import type { QuickLookTabPort } from "./quicklook-launcher.ts";
import type { QuickLookView } from "./quicklook-model.ts";

/**
 * QuickLookTabPort over chrome.scripting and chrome.action. The overlay bundle is a classic script
 * (executeScript `files` cannot load ES modules); the toggle runs in the same isolated world afterwards.
 *
 * @example await new ChromeQuickLookTabPort("quicklook.js", "popup.html").injectAndToggle(7, "specs")
 */
export class ChromeQuickLookTabPort implements QuickLookTabPort {
  constructor(
    private readonly overlayScriptFile: string,
    private readonly popupPage: string,
  ) {}

  async injectAndToggle(tabId: number, view: QuickLookView): Promise<void> {
    // The page-side function receives the view as an argument: executeScript cannot close over `view`.
    await this.callOverlay(tabId, view, (requested: QuickLookView): boolean => {
      globalThis.pickyQuickLook?.toggle(requested);
      return globalThis.pickyQuickLook !== undefined;
    });
  }

  /** Opens Quick Look on the specs of `snapshot`, a product that is not this tab's page. */
  async injectAndShowProduct(tabId: number, snapshot: ProductSnapshot): Promise<void> {
    // As JSON text: executeScript drops null-valued properties from object args (heading: null → missing).
    await this.callOverlay(tabId, JSON.stringify(snapshot), (productJson: string): boolean => {
      globalThis.pickyQuickLook?.showProduct(JSON.parse(productJson) as ProductSnapshot);
      return globalThis.pickyQuickLook !== undefined;
    });
  }

  /**
   * Runs `call` against the page's overlay, injecting the overlay bundle first only when this page does not
   * have it yet: re-injecting would make the page parse the whole bundle again on every click.
   * `call` must return whether the overlay was there.
   */
  private async callOverlay<Arg>(tabId: number, arg: Arg, call: (arg: Arg) => boolean): Promise<void> {
    if (await this.runInPage(tabId, arg, call)) return;
    await chrome.scripting.executeScript({ target: { tabId }, files: [this.overlayScriptFile] });
    if (!(await this.runInPage(tabId, arg, call))) {
      throw new Error(`Picky Quick Look script did not load in tab ${tabId}`);
    }
  }

  private async runInPage<Arg>(tabId: number, arg: Arg, call: (arg: Arg) => boolean): Promise<boolean> {
    const [injection] = await chrome.scripting.executeScript({ target: { tabId }, args: [arg], func: call });
    return injection?.result === true;
  }

  /** Shows the popup for this tab once; popup-entry.ts clears the override as it opens (clearPopupOverride). */
  async openPopupFor(tabId: number): Promise<void> {
    await chrome.action.setPopup({ tabId, popup: this.popupPage });
    await chrome.action.openPopup();
  }
}
