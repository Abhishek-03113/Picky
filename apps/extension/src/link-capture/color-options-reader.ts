import type { ColorOption, ProductSnapshot } from "@picky/catalog";
import { withColorPageDetails } from "./color-page-reader.ts";
import type { HtmlFetcher } from "./html-fetcher.ts";
import type { SnapshotReader } from "./snapshot-reader.ts";

// Each colour is its own listing; reading its page costs one ~2 MB download. Products with dozens of
// colours (21 on the Van Heusen polo) are capped so a save stays a few seconds, not a minute.
export const MAX_COLOR_PAGES = 12;
const PARALLEL_READS = 3;
const READ_TIMEOUT_MS = 10_000;

export interface ColorOptionsReaderDependencies {
  fetcher: HtmlFetcher;
  reader: SnapshotReader;
  log: (event: string, fields: Record<string, string | number>) => void;
  timeoutMs?: number;
}

/**
 * Fills in price, availability and photo for a snapshot's other colours by downloading each colour's
 * own product page (with the user's cookies) and reading it with the same extractor. A colour whose
 * page fails keeps its swatch-only entry; this never throws, so a save is never lost to a colour.
 *
 * @example const complete = await new ColorOptionsReader({ fetcher, reader, log }).fillIn(snapshot)
 */
export class ColorOptionsReader {
  constructor(private readonly deps: ColorOptionsReaderDependencies) {}

  async fillIn(snapshot: ProductSnapshot): Promise<ProductSnapshot> {
    const unread = snapshot.colorOptions.filter((option) => !option.selected && option.price === null);
    const toRead = unread.slice(0, MAX_COLOR_PAGES);
    if (toRead.length === 0) return snapshot;
    const read = await mapInParallel(toRead, PARALLEL_READS, (option) => this.readOption(option));
    const byId = new Map(read.map((option) => [option.externalId, option]));
    this.deps.log("color_options.read", { externalId: snapshot.externalId, colors: toRead.length });
    return { ...snapshot, colorOptions: snapshot.colorOptions.map((option) => byId.get(option.externalId) ?? option) };
  }

  private async readOption(option: ColorOption): Promise<ColorOption> {
    try {
      const page = await withTimeout(this.readPage(option.url), this.deps.timeoutMs ?? READ_TIMEOUT_MS, option.url);
      return withColorPageDetails(option, page);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.deps.log("color_options.read_failed", { url: option.url, reason });
      return option;
    }
  }

  private async readPage(url: string): Promise<ProductSnapshot> {
    return this.deps.reader.read(await this.deps.fetcher.fetchHtml(url), url);
  }
}

/** Runs `work` over `items` with at most `limit` in flight, keeping the input order. */
async function mapInParallel<T, R>(items: readonly T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function withTimeout<T>(promise: Promise<T>, ms: number, url: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Reading ${url} took longer than ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
