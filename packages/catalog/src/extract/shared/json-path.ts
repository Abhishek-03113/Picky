const UNDERSCORE_RUN = /_+/g;

/**
 * The value at a property path inside parsed JSON, or undefined when any step is missing or not an
 * object. Store state JSON changes shape without notice, so every step is guarded.
 *
 * @example jsonAt({ a: { b: [1] } }, ["a", "b"]) // [1]
 * @example jsonAt({ a: null }, ["a", "b"]) // undefined
 */
export function jsonAt(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * A trimmed non-empty string, else undefined.
 *
 * @example jsonText("  Sony ") // "Sony"
 * @example jsonText(42) // undefined
 */
export function jsonText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text === "" ? undefined : text;
}

/**
 * A finite number, also from a numeric string ("12.99"), else undefined.
 *
 * @example jsonNumber("12.99") // 12.99
 * @example jsonNumber("n/a") // undefined
 */
export function jsonNumber(value: unknown): number | undefined {
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : undefined;
}

/**
 * An array, or [] for anything else.
 *
 * @example jsonList(undefined) // []
 */
export function jsonList(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Turns a SCREAMING_SNAKE status code into readable text; undefined when blank.
 *
 * @example statusCodeLabel("OUT_OF_STOCK") // "Out of stock"
 */
export function statusCodeLabel(code: string): string | undefined {
  const words = code.replace(UNDERSCORE_RUN, " ").trim().toLowerCase();
  return words === "" ? undefined : words.charAt(0).toUpperCase() + words.slice(1);
}
