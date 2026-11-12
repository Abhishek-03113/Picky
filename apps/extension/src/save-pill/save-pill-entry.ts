import { looksLikeProductLink, siteForUrl } from "@picky/catalog/sites";
import { ChromeKeyValueStorage } from "../chrome-key-value-storage.ts";
import { failureHint } from "../failure-hint.ts";
import type { ExtensionResponse, SavePillRequest } from "../messaging/messages.ts";
import { Dom } from "../popup/dom.ts";
import { parseSettings, SETTINGS_KEY, SettingsStore, type ExtensionSettings } from "../settings.ts";
import { markFor, PAGE_MARKS_KEY, parsePageMarks, type PageMark, type PageMarksRecord } from "./page-marks.ts";
import { clampBottom, DEFAULT_PILL_BOTTOM, pillState, showsPill, type PillState } from "./save-pill-model.ts";
import { SavePillView } from "./save-pill-view.ts";

// The Save pill (decision D8): a small "Save to Picky" button bottom-right on store product pages. Declared
// for the required stores in the manifest (site-manifest.ts) and registered for allowed beta stores
// (permissions/store-scripts.ts). Kept small: it imports registry data from @picky/catalog/sites, never
// readers or zod. It reads nothing from the page; the worker reads the page when "Save to Picky" is
// clicked, exactly like the right-click "Save to Picky". No polling, no page-wide MutationObserver: it
// follows in-page navigation through navigation/popstate events and one history hook, and its state
// through chrome.storage.onChanged.
declare const __PICKY_SAVE_PILL_CSS__: string;

declare global {
  var pickySavePill: true | undefined;
}

/** How long a "Couldn't …" note stays above the pill. */
const NOTE_MS = 6000;

interface PillContext {
  source: string;
  storeLabel: string;
  settings: ExtensionSettings;
  marks: PageMarksRecord;
  /** A click the worker has not answered yet. */
  pending: boolean;
  note: string | null;
}

function send(request: SavePillRequest): Promise<ExtensionResponse<unknown>> {
  return chrome.runtime.sendMessage(request).catch((error: unknown) => ({
    ok: false as const,
    message: error instanceof Error ? error.message : String(error),
  }));
}

interface MountedPill {
  view: SavePillView;
  host: HTMLElement;
}

function mountPill(storeLabel: string, actions: ConstructorParameters<typeof SavePillView>[4]): MountedPill {
  const host = document.createElement("picky-save-pill");
  const root = host.attachShadow({ mode: "closed" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(__PICKY_SAVE_PILL_CSS__);
  root.adoptedStyleSheets = [sheet];
  const view = new SavePillView(new Dom(document), host, root, storeLabel, actions);
  document.documentElement.append(host);
  document.addEventListener("click", (event) => {
    if (!event.composedPath().includes(host)) view.closeMenu();
  });
  return { view, host };
}

/**
 * Calls `listener` when the page's URL changes without a reload. The Navigation API sees the page's own
 * pushState / replaceState (this script's history hook only sees calls from this isolated world), popstate
 * covers back and forward.
 */
function onUrlChange(listener: () => void): void {
  let last = location.href;
  const check = (): void => {
    if (location.href === last) return;
    last = location.href;
    listener();
  };
  window.addEventListener("popstate", check);
  (globalThis as { navigation?: EventTarget }).navigation?.addEventListener("currententrychange", check);
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      original.apply(this, args);
      check();
    };
  }
}

function start(): void {
  const site = siteForUrl(location.href);
  if (site === null) return;
  const settingsStore = new SettingsStore(new ChromeKeyValueStorage());
  const context: PillContext = {
    source: site.source,
    storeLabel: site.label,
    settings: parseSettings(undefined),
    marks: {},
    pending: false,
    note: null,
  };
  let pill: MountedPill | null = null;
  let noteTimer: ReturnType<typeof setTimeout> | undefined;

  const showNote = (note: string): void => {
    context.note = note;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      context.note = null;
      render();
    }, NOTE_MS);
  };

  const activate = (state: PillState): void => {
    if (state.kind === "save") {
      context.pending = true;
      void send({ type: "pill:save", url: location.href, title: document.title }).then((reply) => {
        // On success the worker's page mark ends the wait; a refused request ends it here.
        if (reply.ok) return;
        context.pending = false;
        showNote(`Couldn't save this page. ${failureHint(reply.message)}`);
        render();
      });
    } else if (state.kind === "saved") {
      context.pending = true;
      void send({ type: "pill:add-to-cart", url: location.href, productId: state.productId }).then((reply) => {
        context.pending = false;
        if (!reply.ok) showNote(`Couldn't add it to your cart. ${failureHint(reply.message)}`);
        render();
      });
    } else if (state.kind === "in-cart") {
      void send({ type: "pill:open-cart" });
    }
    render();
  };

  const render = (): void => {
    const visible = showsPill({
      isProductPage: looksLikeProductLink(location.href),
      source: context.source,
      settings: context.settings,
    });
    if (!visible) {
      pill?.host.remove();
      return;
    }
    pill ??= mountPill(context.storeLabel, {
      activate,
      hideOnStore: () => void settingsStore.hideSavePillOn(context.source),
      hideEverywhere: () => void settingsStore.setShowSavePill(false),
      moved: (bottom) => void settingsStore.setSavePillBottom(bottom),
    });
    if (!pill.host.isConnected) document.documentElement.append(pill.host);
    const bottom = clampBottom(context.settings.savePillBottom ?? DEFAULT_PILL_BOTTOM, window.innerHeight);
    const mark = markFor(context.marks, location.href);
    pill.view.render(pillState(mark, context.pending, Date.now()), bottom, context.note);
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const settingsChange = changes[SETTINGS_KEY];
    const marksChange = changes[PAGE_MARKS_KEY];
    if (settingsChange === undefined && marksChange === undefined) return;
    if (settingsChange !== undefined) context.settings = parseSettings(settingsChange.newValue);
    if (marksChange !== undefined) {
      const before: PageMark | null = markFor(context.marks, location.href);
      context.marks = parsePageMarks(marksChange.newValue);
      // The worker has picked up this page's save: its mark now tells the story.
      if (JSON.stringify(markFor(context.marks, location.href)) !== JSON.stringify(before)) context.pending = false;
    }
    render();
  });

  onUrlChange(() => {
    context.pending = false;
    context.note = null;
    render();
  });

  void chrome.storage.local.get([SETTINGS_KEY, PAGE_MARKS_KEY]).then((stored) => {
    context.settings = parseSettings(stored[SETTINGS_KEY]);
    context.marks = parsePageMarks(stored[PAGE_MARKS_KEY]);
    render();
  });
}

// Runs once per page: the worker also injects it into the open tab right after a store is allowed.
if (globalThis.pickySavePill === undefined) {
  globalThis.pickySavePill = true;
  start();
}
