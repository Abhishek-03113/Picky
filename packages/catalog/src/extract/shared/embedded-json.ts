import type { PageNode } from "../../page/page-node.ts";

/** Where a page keeps its state JSON: a script's id, or the assignment that precedes the JSON. */
export interface EmbeddedJsonLocation {
  /** `<script id>` whose whole text is JSON, e.g. "__NEXT_DATA__". */
  scriptId?: string;
  /** Text right before the JSON inside a script, e.g. "window['__PRELOADED_STATE__']". */
  marker?: string;
}

// Past this the page is not one product's state; parsing it would stall the extension.
const MAX_JSON_LENGTH = 5 * 1024 * 1024;
const OPENING_BRACKETS = new Set(["{", "["]);
const ASSIGNMENT_GAP = /^[\s=:(]*/;

/**
 * The JSON a page embeds for its own scripts, parsed; null when the script is missing, the JSON is over
 * 5 MB or does not parse. With a marker, the JSON is the object or array that follows it, so
 * `window.__STATE__ = {...};` reads without the surrounding code.
 *
 * @example readEmbeddedJson(page, { scriptId: "__NEXT_DATA__" }) // { props: { pageProps: { … } } }
 * @example readEmbeddedJson(page, { marker: "window['__PRELOADED_STATE__']" }) // { product: { … } }
 */
export function readEmbeddedJson(page: PageNode, location: EmbeddedJsonLocation): unknown {
  const json = embeddedJsonText(page, location);
  if (json === null || json.length > MAX_JSON_LENGTH) return null;
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}

function embeddedJsonText(page: PageNode, { scriptId, marker }: EmbeddedJsonLocation): string | null {
  if (scriptId !== undefined) {
    const script = page.findAll(`script[id="${scriptId}"]`)[0];
    return script === undefined ? null : script.text();
  }
  if (marker === undefined) return null;
  for (const script of page.findAll("script")) {
    const json = jsonAfterMarker(script.text(), marker);
    if (json !== null) return json;
  }
  return null;
}

/**
 * The balanced `{…}` or `[…]` that follows the marker in a script's text, or null.
 *
 * @example jsonAfterMarker('window.__S__ = {"a":[1]};', "window.__S__") // '{"a":[1]}'
 */
export function jsonAfterMarker(source: string, marker: string): string | null {
  const markerAt = source.indexOf(marker);
  if (markerAt === -1) return null;
  const afterMarker = markerAt + marker.length;
  const start = afterMarker + (ASSIGNMENT_GAP.exec(source.slice(afterMarker, afterMarker + 64))?.[0].length ?? 0);
  if (!OPENING_BRACKETS.has(source[start] ?? "")) return null;
  const end = balancedEnd(source, start);
  return end === null ? null : source.slice(start, end + 1);
}

// Index of the bracket that closes the one at `start`, skipping brackets inside strings; null when unclosed
// or longer than the size limit.
function balancedEnd(source: string, start: number): number | null {
  const limit = Math.min(source.length, start + MAX_JSON_LENGTH);
  let depth = 0;
  let quote: string | null = null;
  for (let index = start; index < limit; index += 1) {
    const char = source[index];
    if (quote !== null) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"') {
      quote = char;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return null;
}
