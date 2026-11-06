/**
 * Manifest host permissions: the ones already declared (the stores we fetch product links from, see
 * site-manifest.ts) plus the API host, without duplicates.
 *
 * @example mergeHostPermissions(["https://www.amazon.in/*"], "http://localhost:8787/*")
 * // ["https://www.amazon.in/*", "http://localhost:8787/*"]
 */
export function mergeHostPermissions(declared: readonly string[], apiHost: string): string[] {
  return [...new Set([...declared, apiHost])];
}
