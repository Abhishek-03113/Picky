import type { KeyValueStorage } from "../settings.ts";

/**
 * chrome.storage.local key of what the Save pill shows per product page. The worker writes it; every pill
 * reads it on load and follows chrome.storage.onChanged, so no pill polls or asks the worker.
 */
export const PAGE_MARKS_KEY = "picky.pageMarks";
/** Oldest pages are forgotten past this many, so the record stays a few kilobytes. */
const MAX_MARKS = 200;

/** What Picky knows about one product page. Plain JSON: content scripts read it from storage. */
export type PageMark =
  /** `since`: epoch ms the save started, so a save the worker never finished does not stick. */
  | { state: "reading"; since: number }
  /** `cartQuantity` 0: saved, not in the cart. */
  | { state: "saved"; productId: string; cartQuantity: number };

export type PageMarksRecord = Readonly<Record<string, PageMark>>;

/**
 * The key a page is remembered by: origin and path, without the query and hash that tracking links and
 * variant pickers add.
 *
 * @example pageKey("https://www.amazon.in/dp/B0FQG1YHYR?ref=x#y") // "https://www.amazon.in/dp/B0FQG1YHYR"
 */
export function pageKey(url: string): string {
  const parsed = URL.parse(url);
  return parsed === null ? url : `${parsed.origin}${parsed.pathname}`;
}

/**
 * The stored record, dropping anything malformed.
 *
 * @example parsePageMarks({ "https://x/p": { state: "reading", since: 1 } }) // { "https://x/p": { state: "reading", since: 1 } }
 */
export function parsePageMarks(stored: unknown): PageMarksRecord {
  if (typeof stored !== "object" || stored === null) return {};
  return Object.fromEntries(
    Object.entries(stored).filter((entry): entry is [string, PageMark] => isPageMark(entry[1])),
  );
}

/**
 * The mark for a page, or null when Picky has not saved it.
 *
 * @example markFor(marks, location.href)?.state // "saved"
 */
export function markFor(marks: PageMarksRecord, url: string): PageMark | null {
  return marks[pageKey(url)] ?? null;
}

function isPageMark(value: unknown): value is PageMark {
  if (typeof value !== "object" || value === null) return false;
  const mark = value as Partial<Record<string, unknown>>;
  if (mark.state === "reading") return typeof mark.since === "number";
  return mark.state === "saved" && typeof mark.productId === "string" && typeof mark.cartQuantity === "number";
}

/**
 * The worker's side: records what happened to a page so its pill follows.
 *
 * @example await new PageMarks(storage).set(url, { state: "saved", productId: "p1", cartQuantity: 0 })
 */
export class PageMarks {
  constructor(private readonly storage: KeyValueStorage) {}

  async get(url: string): Promise<PageMark | null> {
    return markFor(parsePageMarks(await this.storage.read(PAGE_MARKS_KEY)), url);
  }

  /** `null` forgets the page (a save that failed). */
  async set(url: string, mark: PageMark | null): Promise<void> {
    const key = pageKey(url);
    const others = Object.entries(parsePageMarks(await this.storage.read(PAGE_MARKS_KEY))).filter(
      ([page]) => page !== key,
    );
    const kept = others.slice(-(MAX_MARKS - 1));
    const next = mark === null ? Object.fromEntries(kept) : Object.fromEntries([...kept, [key, mark]]);
    await this.storage.write(PAGE_MARKS_KEY, next);
  }
}
