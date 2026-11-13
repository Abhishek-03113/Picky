import { describe, expect, test } from "bun:test";
import { SettingsStore, type ExtensionSettings } from "../src/settings.ts";
import { FakeKeyValueStorage } from "./fakes/fake-key-value-storage.ts";

const DEFAULTS: ExtensionSettings = {
  autoOpenSheet: false,
  firstRunDismissed: false,
  lastComparisonId: null,
  lastCartId: null,
  showSavePill: true,
  savePillHiddenOn: [],
  savePillBottom: null,
};

describe("SettingsStore", () => {
  test("defaults to auto-open OFF and first run not dismissed", async () => {
    const store = new SettingsStore(new FakeKeyValueStorage());
    expect(await store.load()).toEqual(DEFAULTS);
    expect(await store.isAutoOpenEnabled()).toBe(false);
  });

  test("persists each change without losing the other setting", async () => {
    const storage = new FakeKeyValueStorage();
    await new SettingsStore(storage).setAutoOpenSheet(true);
    await new SettingsStore(storage).dismissFirstRun();
    expect(await new SettingsStore(storage).load()).toEqual({
      ...DEFAULTS,
      autoOpenSheet: true,
      firstRunDismissed: true,
    });
  });

  test("ignores corrupt stored values", async () => {
    const store = new SettingsStore(new FakeKeyValueStorage({ "picky.settings": { autoOpenSheet: "no" } }));
    expect(await store.load()).toEqual(DEFAULTS);
    expect(await new SettingsStore(new FakeKeyValueStorage({ "picky.settings": 7 })).load()).toEqual(DEFAULTS);
  });

  test("remembers the last-used comparison alongside the other settings", async () => {
    const storage = new FakeKeyValueStorage();
    await new SettingsStore(storage).dismissFirstRun();
    await new SettingsStore(storage).setLastComparisonId("cmp-1");
    const store = new SettingsStore(storage);
    expect(await store.lastComparisonId()).toBe("cmp-1");
    expect((await store.load()).firstRunDismissed).toBe(true);
  });
});
