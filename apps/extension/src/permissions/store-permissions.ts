import type { SupportedSite } from "@picky/catalog/sites";
import type { KeyValueStorage } from "../settings.ts";
import { isOptionalStore, storeOrigins, storeSiteForSource } from "./store-sites.ts";

/**
 * Site access for one store, by registry source id ("walmart.com"). Required stores (Amazon, Flipkart)
 * always have it; beta stores are optional host permissions the shopper grants once.
 */
export interface StorePermissions {
  /** True when Picky may read pages on this store outside the open tab (fetching links, colour pages). */
  has(source: string): Promise<boolean>;
  /** Shows Chrome's prompt; must run during a user gesture. Resolves to whether access was granted. */
  request(source: string): Promise<boolean>;
}

/**
 * StorePermissions over chrome.permissions with the registry's host patterns.
 *
 * @example await new ChromeStorePermissions().has("target.com") // false until the shopper allows Target
 */
export class ChromeStorePermissions implements StorePermissions {
  async has(source: string): Promise<boolean> {
    const site = storeSiteForSource(source);
    if (site === null) return false;
    if (!isOptionalStore(site)) return true;
    return chrome.permissions.contains({ origins: storeOrigins(site) });
  }

  async request(source: string): Promise<boolean> {
    const site = storeSiteForSource(source);
    if (site === null) return false;
    if (!isOptionalStore(site)) return true;
    return chrome.permissions.request({ origins: storeOrigins(site) });
  }
}

const DECLINED_KEY = "picky.declinedStores";

/**
 * Stores the shopper answered "Not now" for, in chrome.storage.local, so Picky does not ask again there.
 * Granting access later (from the toast, the grant page or chrome://extensions) clears the answer.
 *
 * @example await new DeclinedStores(storage).decline("etsy.com")
 */
export class DeclinedStores {
  constructor(private readonly storage: KeyValueStorage) {}

  async isDeclined(source: string): Promise<boolean> {
    return (await this.all()).includes(source);
  }

  async decline(source: string): Promise<void> {
    const declined = await this.all();
    if (!declined.includes(source)) await this.storage.write(DECLINED_KEY, [...declined, source]);
  }

  async clear(source: string): Promise<void> {
    const declined = await this.all();
    if (declined.includes(source)) {
      await this.storage.write(
        DECLINED_KEY,
        declined.filter((entry) => entry !== source),
      );
    }
  }

  private async all(): Promise<string[]> {
    const stored = await this.storage.read(DECLINED_KEY);
    return Array.isArray(stored) ? stored.filter((entry): entry is string => typeof entry === "string") : [];
  }
}

/** What Picky should do before reading a link on a store. */
export type StoreAccess =
  | { kind: "allowed" }
  /** A beta store not granted yet: ask, from a toast button. */
  | { kind: "ask"; site: SupportedSite }
  /** A beta store the shopper said "Not now" to: do not ask again. */
  | { kind: "declined"; site: SupportedSite };

/**
 * Decides, for a link Picky is about to download, whether it can go ahead, should ask or must stay quiet.
 *
 * @example (await storeAccess.forUrl("https://www.walmart.com/ip/1")).kind // "ask"
 */
export class StoreAccessCheck {
  constructor(
    private readonly permissions: StorePermissions,
    private readonly declined: DeclinedStores,
    private readonly siteForUrl: (url: string) => SupportedSite | null,
  ) {}

  async forUrl(url: string): Promise<StoreAccess> {
    const site = this.siteForUrl(url);
    if (site === null || (await this.permissions.has(site.source))) return { kind: "allowed" };
    return (await this.declined.isDeclined(site.source)) ? { kind: "declined", site } : { kind: "ask", site };
  }

  /** True when the page at `url` may be downloaded now; the colour-options reader skips it otherwise. */
  async canFetch(url: string): Promise<boolean> {
    return (await this.forUrl(url)).kind === "allowed";
  }
}
