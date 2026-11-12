/** Thin key-value storage the extension owns; chrome-key-value-storage.ts implements it over chrome.storage.local. */
export interface KeyValueStorage {
  read(key: string): Promise<unknown>;
  write(key: string, value: unknown): Promise<void>;
}

export interface ExtensionSettings {
  /** Open the spec sheet tab as soon as a capture is saved. Off by default: the popup's own "View specs" is the primary path. */
  autoOpenSheet: boolean;
  /** True once the user pressed "Got it" on the first-run screen. */
  firstRunDismissed: boolean;
  /** The comparison Quick Look and "Add to Picky" offer first; null until the user picks or creates one. */
  lastComparisonId: string | null;
  /** The cart Quick Look's Cart view and "Add to cart" use; null until the shopper picks or adds to one. */
  lastCartId: string | null;
  /** "Show the Save button on store pages": the Save pill on product pages. On by default; "Hide everywhere" turns it off. */
  showSavePill: boolean;
  /** Stores (registry sources) the shopper chose "Hide on <Store>" for. */
  savePillHiddenOn: string[];
  /** Where the shopper dragged the pill, in px from the bottom of the window; null keeps the default. */
  savePillBottom: number | null;
}

/** chrome.storage.local key of the settings; the Save pill follows it through chrome.storage.onChanged. */
export const SETTINGS_KEY = "picky.settings";
const DEFAULT_SETTINGS: ExtensionSettings = {
  autoOpenSheet: false,
  firstRunDismissed: false,
  lastComparisonId: null,
  lastCartId: null,
  showSavePill: true,
  savePillHiddenOn: [],
  savePillBottom: null,
};

/**
 * The stored settings, with defaults for anything missing or malformed.
 *
 * @example parseSettings(undefined).showSavePill // true
 */
export function parseSettings(stored: unknown): ExtensionSettings {
  if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;
  const fields = stored as Partial<Record<keyof ExtensionSettings, unknown>>;
  return {
    autoOpenSheet: typeof fields.autoOpenSheet === "boolean" ? fields.autoOpenSheet : DEFAULT_SETTINGS.autoOpenSheet,
    firstRunDismissed:
      typeof fields.firstRunDismissed === "boolean" ? fields.firstRunDismissed : DEFAULT_SETTINGS.firstRunDismissed,
    lastComparisonId: typeof fields.lastComparisonId === "string" ? fields.lastComparisonId : null,
    lastCartId: typeof fields.lastCartId === "string" ? fields.lastCartId : null,
    showSavePill: typeof fields.showSavePill === "boolean" ? fields.showSavePill : DEFAULT_SETTINGS.showSavePill,
    savePillHiddenOn: Array.isArray(fields.savePillHiddenOn)
      ? fields.savePillHiddenOn.filter((source): source is string => typeof source === "string")
      : [],
    savePillBottom: typeof fields.savePillBottom === "number" ? fields.savePillBottom : null,
  };
}

/**
 * Persisted popup preferences. Unreadable or missing storage falls back to the defaults
 * (auto-open OFF, first run not yet seen).
 *
 * @example await new SettingsStore(storage).setAutoOpenSheet(false)
 */
export class SettingsStore {
  constructor(private readonly storage: KeyValueStorage) {}

  async load(): Promise<ExtensionSettings> {
    return parseSettings(await this.storage.read(SETTINGS_KEY));
  }

  async isAutoOpenEnabled(): Promise<boolean> {
    return (await this.load()).autoOpenSheet;
  }

  async setAutoOpenSheet(autoOpenSheet: boolean): Promise<void> {
    await this.update({ autoOpenSheet });
  }

  async lastComparisonId(): Promise<string | null> {
    return (await this.load()).lastComparisonId;
  }

  async setLastComparisonId(lastComparisonId: string): Promise<void> {
    await this.update({ lastComparisonId });
  }

  async lastCartId(): Promise<string | null> {
    return (await this.load()).lastCartId;
  }

  async setLastCartId(lastCartId: string): Promise<void> {
    await this.update({ lastCartId });
  }

  /** "Show the Save button on store pages"; false is also the pill's "Hide everywhere". */
  async setShowSavePill(showSavePill: boolean): Promise<void> {
    await this.update(showSavePill ? { showSavePill, savePillHiddenOn: [] } : { showSavePill });
  }

  /** The pill's "Hide on <Store>". */
  async hideSavePillOn(source: string): Promise<void> {
    const hidden = (await this.load()).savePillHiddenOn;
    if (!hidden.includes(source)) await this.update({ savePillHiddenOn: [...hidden, source] });
  }

  async setSavePillBottom(savePillBottom: number): Promise<void> {
    await this.update({ savePillBottom });
  }

  async dismissFirstRun(): Promise<void> {
    await this.update({ firstRunDismissed: true });
  }

  private async update(change: Partial<ExtensionSettings>): Promise<void> {
    await this.storage.write(SETTINGS_KEY, { ...(await this.load()), ...change });
  }
}
