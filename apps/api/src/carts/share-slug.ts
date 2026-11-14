// Crockford's base32 in lower case: 32 symbols without i, l, o and u, so a slug read aloud or retyped
// from a screenshot has no look-alikes. 32 divides 256, so `byte % 32` picks every symbol equally often.
const SLUG_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const SLUG_LENGTH = 16;
const GROUP_LENGTH = 4;
const SLUG_PATTERN = /^[0-9a-hjkmnp-tv-z]{4}(-[0-9a-hjkmnp-tv-z]{4}){3}$/;

type RandomFill = (bytes: Uint8Array) => Uint8Array;

/**
 * A new unguessable share slug (80 bits), grouped for reading: `xxxx-xxxx-xxxx-xxxx`.
 *
 * @example generateShareSlug() // "7k2m-q9xd-4hwp-ra3c"
 */
export function generateShareSlug(fill: RandomFill = (bytes) => crypto.getRandomValues(bytes)): string {
  const symbols = Array.from(fill(new Uint8Array(SLUG_LENGTH)), (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length]);
  const groups: string[] = [];
  for (let start = 0; start < SLUG_LENGTH; start += GROUP_LENGTH) {
    groups.push(symbols.slice(start, start + GROUP_LENGTH).join(""));
  }
  return groups.join("-");
}

/**
 * The slug as stored (lower case, trimmed), or null when it cannot be one, so lookups skip the database.
 *
 * @example normalizeShareSlug(" 7K2M-Q9XD-4HWP-RA3C ") // "7k2m-q9xd-4hwp-ra3c"
 */
export function normalizeShareSlug(candidate: string): string | null {
  const slug = candidate.trim().toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : null;
}
