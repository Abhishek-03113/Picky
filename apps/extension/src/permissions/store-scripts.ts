import type { SupportedSite } from "@picky/catalog/sites";
import type { StorePermissions } from "./store-permissions.ts";
import { optionalStoreSites, STORE_CONTENT_SCRIPTS, storeOrigins, storeSiteForSource } from "./store-sites.ts";

/** Runs the store content scripts (Alt+click, Save pill) on allowed beta stores; Chrome implementation below. */
export interface StoreScriptRegistry {
  /** Registers the scripts for the store; already registered is fine. */
  register(site: SupportedSite): Promise<void>;
  /** Stops them on the store, after its access was removed. */
  unregister(site: SupportedSite): Promise<void>;
  /** Runs them once in an open tab of the store, so a fresh grant shows the pill without a reload. */
  injectInto(tabId: number): Promise<void>;
}

/**
 * StoreScriptRegistry over chrome.scripting.registerContentScripts. One registration per store, with an id
 * derived from its source, so registering twice is a no-op and removal is exact.
 *
 * @example await new ChromeStoreScriptRegistry().register(shoppingSite("walmart.com"))
 */
export class ChromeStoreScriptRegistry implements StoreScriptRegistry {
  async register(site: SupportedSite): Promise<void> {
    const id = scriptId(site);
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (existing.length > 0) return;
    await chrome.scripting.registerContentScripts([
      {
        id,
        matches: storeOrigins(site),
        js: [...STORE_CONTENT_SCRIPTS],
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
  }

  async unregister(site: SupportedSite): Promise<void> {
    const id = scriptId(site);
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (existing.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [id] });
  }

  async injectInto(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({ target: { tabId }, files: [...STORE_CONTENT_SCRIPTS] });
  }
}

function scriptId(site: SupportedSite): string {
  return `picky-store-${site.source}`;
}

type Logger = (event: string, fields: Record<string, string | number>) => void;

/**
 * Keeps the registered store scripts in line with what the shopper allowed: every granted beta store on
 * startup and install, a store as soon as it is granted, none for a store whose access was removed.
 *
 * @example await new StoreScriptSync(permissions, registry, log).syncAll()
 */
export class StoreScriptSync {
  constructor(
    private readonly permissions: StorePermissions,
    private readonly registry: StoreScriptRegistry,
    private readonly log: Logger,
  ) {}

  /** Registers the scripts for every beta store Picky has access to and removes the rest. */
  async syncAll(): Promise<void> {
    await Promise.all(optionalStoreSites().map((site) => this.sync(site)));
  }

  /** Re-checks the stores whose origins changed (chrome.permissions.onAdded / onRemoved). */
  async syncOrigins(origins: readonly string[]): Promise<void> {
    const changed = optionalStoreSites().filter((site) => storeOrigins(site).some((origin) => origins.includes(origin)));
    await Promise.all(changed.map((site) => this.sync(site)));
  }

  /** Same as sync, by source id, for the grant flow. */
  async syncSource(source: string): Promise<void> {
    const site = storeSiteForSource(source);
    if (site !== null) await this.sync(site);
  }

  private async sync(site: SupportedSite): Promise<void> {
    try {
      if (await this.permissions.has(site.source)) await this.registry.register(site);
      else await this.registry.unregister(site);
    } catch (error) {
      this.log("store_scripts.sync_failed", {
        source: site.source,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
