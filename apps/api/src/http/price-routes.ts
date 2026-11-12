import { Hono, type Context } from "hono";
import type { PriceHistory } from "@picky/catalog";
import type { ProductRepository } from "../products/product-repository.ts";
import type { PriceObservationRepository } from "../prices/price-observation-repository.ts";
import type { SignedInEnv } from "./session-cookie.ts";

export interface PriceRouteDependencies {
  repository: ProductRepository;
  priceObservations: PriceObservationRepository;
}

const DEFAULT_DROP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Price endpoints of the signed-in user's library, mounted under /api behind `requireUser`:
 * GET /products/:id/prices and GET /price-drops (optional ?since=<ISO>, default 7 days ago).
 *
 * @example app.route("/api", createPriceRoutes({ repository, priceObservations }))
 */
export function createPriceRoutes(deps: PriceRouteDependencies): Hono<SignedInEnv> {
  return new Hono<SignedInEnv>()
    .get("/products/:id/prices", (c) => showHistory(c, deps))
    .get("/price-drops", (c) => listDrops(c, deps));
}

async function showHistory(c: Context<SignedInEnv>, deps: PriceRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const userId = c.get("user").id;
  if ((await deps.repository.findProductById(userId, id)) === null)
    return c.json({ error: "NotFound", message: `No product with id "${id}"` }, 404);
  const history: PriceHistory = {
    productId: id,
    observations: await deps.priceObservations.listObservations(userId, id),
  };
  return c.json({ history });
}

async function listDrops(c: Context<SignedInEnv>, deps: PriceRouteDependencies): Promise<Response> {
  const raw = c.req.query("since");
  const since = raw === undefined ? new Date(Date.now() - DEFAULT_DROP_WINDOW_MS) : new Date(raw);
  if (Number.isNaN(since.getTime()))
    return c.json({ error: "BadRequest", message: `"since" must be an ISO date, got "${raw}"` }, 400);
  return c.json({ drops: await deps.priceObservations.listRecentDrops(c.get("user").id, since) });
}
