import type { QuickLookPageHooks } from "../../src/quicklook/overlay-host.ts";
import type { CaptureResult } from "../../src/capture-result.ts";

interface ExecuteScriptOptions {
  target: { tabId: number };
  files?: string[];
  func?: (...args: never[]) => unknown;
  args?: unknown[];
}

/**
 * Stands in for chrome.scripting on one tab. Injecting "quicklook.js" or "page-capture.js" sets the page
 * global the real bundle sets; a `func` runs here, where it sees those globals. Records each call.
 */
export class FakeScriptingTab {
  readonly calls: string[] = [];
  readonly toggles: string[] = [];

  constructor(private readonly captureResult: CaptureResult = { ok: false, message: "unused" }) {}

  /** Installs this fake as globalThis.chrome; returns the function that removes it again. */
  install(): () => void {
    const host = globalThis as unknown as Record<string, unknown>;
    const scripting = { executeScript: (options: ExecuteScriptOptions) => this.executeScript(options) };
    host.chrome = { scripting };
    return () => {
      delete host.chrome;
      delete host.pickyQuickLook;
      delete host.pickyCapturePage;
    };
  }

  private async executeScript(options: ExecuteScriptOptions): Promise<{ result: unknown }[]> {
    if (options.files !== undefined) {
      this.calls.push(`inject ${options.files.join(",")}`);
      for (const file of options.files) this.load(file);
      return [];
    }
    this.calls.push("call");
    const run = options.func as (...args: unknown[]) => unknown;
    return [{ result: run(...(options.args ?? [])) }];
  }

  private load(file: string): void {
    const host = globalThis as unknown as Record<string, unknown>;
    if (file === "quicklook.js") {
      const hooks: QuickLookPageHooks = {
        toggle: (view) => void this.toggles.push(view),
        showProduct: (snapshot) => void this.toggles.push(`product ${snapshot.title}`),
      };
      host.pickyQuickLook ??= hooks;
    }
    if (file === "page-capture.js") host.pickyCapturePage = () => this.captureResult;
  }
}
