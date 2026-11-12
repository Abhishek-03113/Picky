import { Hono, type Context, type MiddlewareHandler } from "hono";
import type { CartRepository } from "../carts/cart-repository.ts";

export interface SharedCartRouteDependencies {
  carts: CartRepository;
  /** Defaults to the wall clock; tests pass a fake. */
  now?: () => number;
}

const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 60;
// Past this many tracked addresses, expired windows are dropped so the map cannot grow without bound.
const PRUNE_AT = 10_000;

interface Window {
  startedAt: number;
  count: number;
}

/**
 * The public, read-only shared-cart endpoint, mounted under /api BEFORE `requireUser`:
 * GET /shared-carts/:slug → `{ cart: SharedCartView }`. No owner details or notes; never indexed;
 * limited per client address so slugs cannot be brute-forced cheaply.
 *
 * @example app.route("/api", createSharedCartRoutes({ carts }))
 */
export function createSharedCartRoutes(deps: SharedCartRouteDependencies): Hono {
  return new Hono()
    .use("/shared-carts/*", rateLimitPerAddress(deps.now ?? Date.now))
    .get("/shared-carts/:slug", async (c) => {
      c.header("X-Robots-Tag", "noindex");
      const slug = c.req.param("slug");
      const cart = await deps.carts.findSharedCart(slug);
      if (cart === null) return c.json({ error: "NotFound", message: `No shared cart "${slug}"` }, 404);
      return c.json({ cart });
    });
}

// In memory and per process: on several instances each counts on its own, which is enough to blunt guessing.
function rateLimitPerAddress(now: () => number): MiddlewareHandler {
  const windows = new Map<string, Window>();
  return async (c, next) => {
    const time = now();
    if (windows.size > PRUNE_AT) pruneExpired(windows, time);
    const address = clientAddress(c);
    const current = windows.get(address);
    const window = current === undefined || time - current.startedAt >= WINDOW_MS ? { startedAt: time, count: 0 } : current;
    window.count += 1;
    windows.set(address, window);
    if (window.count > REQUESTS_PER_WINDOW) {
      c.header("Retry-After", String(Math.ceil((window.startedAt + WINDOW_MS - time) / 1000)));
      c.header("X-Robots-Tag", "noindex");
      return c.json({ error: "TooManyRequests", message: "Too many shared-cart requests; try again in a minute" }, 429);
    }
    await next();
  };
}

function pruneExpired(windows: Map<string, Window>, time: number): void {
  for (const [address, window] of windows) {
    if (time - window.startedAt >= WINDOW_MS) windows.delete(address);
  }
}

// Behind Vercel or another proxy the socket address is the proxy's, so the forwarded header comes first.
function clientAddress(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || c.req.header("x-real-ip") || "unknown";
}
