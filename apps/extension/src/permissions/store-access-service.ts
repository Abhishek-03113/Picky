import type { DeclinedStores, StorePermissions } from "./store-permissions.ts";
import type { StoreScriptRegistry } from "./store-scripts.ts";
import { optionalStoreSites, storeOrigins } from "./store-sites.ts";

/** What to run again once access is granted from a toast: the link read that asked for it. */
export interface PermissionRetry {
  action: "add" | "quicklook";
  url: string;
  label: string;
}

export interface StoreAccessDependencies {
  permissions: StorePermissions;
  declined: DeclinedStores;
  registry: StoreScriptRegistry;
  /** Opens the one-button grant page for the store, for when Chrome refuses to prompt from the worker. */
  openGrantPage: (source: string) => Promise<void>;
  /** Runs the link read the permission toast was shown for. */
  retry: (retry: PermissionRetry, tabId: number | null) => Promise<void>;
  log: (event: string, fields: Record<string, string | number>) => void;
}

/**
 * The toast's "Allow Picky on <Store>" and "Not now". Allow asks Chrome for the store's host permission;
 * Chrome only prompts during a user gesture, which a content script's click does not always carry to the
 * worker, so a refused call opens grant.html, whose button asks from an extension page. Once granted,
 * the store scripts run in the tab at once and the link read that asked runs again.
 *
 * @example await storeAccess.allow("walmart.com", 7, { action: "add", url, label: "" })
 */
export class StoreAccessService {
  constructor(private readonly deps: StoreAccessDependencies) {}

  async allow(source: string, tabId: number | null, retry: PermissionRetry | null): Promise<void> {
    const granted = await this.deps.permissions.request(source).catch((error: unknown) => {
      this.deps.log("store_access.prompt_refused", { source, reason: describe(error) });
      return null;
    });
    if (granted === null) return this.deps.openGrantPage(source);
    this.deps.log("store_access.answered", { source, granted: String(granted) });
    if (!granted) return;
    if (tabId !== null) await this.deps.registry.injectInto(tabId).catch(() => undefined);
    if (retry !== null) await this.deps.retry(retry, tabId);
  }

  /** "Not now": Picky stops asking on this store. */
  async decline(source: string): Promise<void> {
    await this.deps.declined.decline(source);
    this.deps.log("store_access.declined", { source });
  }

  /**
   * A grant from anywhere (toast, grant page, chrome://extensions) takes back an earlier "Not now".
   *
   * @example chrome.permissions.onAdded.addListener(({ origins }) => void storeAccess.granted(origins ?? []))
   */
  async granted(origins: readonly string[]): Promise<void> {
    const sites = optionalStoreSites().filter((site) => storeOrigins(site).some((origin) => origins.includes(origin)));
    await Promise.all(sites.map((site) => this.deps.declined.clear(site.source)));
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
