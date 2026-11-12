import { Hono, type Context } from "hono";
import { z } from "zod";
import type { CartRepository } from "../carts/cart-repository.ts";
import type { Logger } from "../logging/json-logger.ts";
import type { ProductRepository } from "../products/product-repository.ts";
import { BadRequestError } from "./http-errors.ts";
import { readJsonBody } from "./read-json-body.ts";
import type { SignedInEnv } from "./session-cookie.ts";

export interface CartRouteDependencies {
  carts: CartRepository;
  repository: ProductRepository;
  logger: Logger;
}

const NameSchema = z.string().trim().min(1).max(120);
const NameBodySchema = z.object({ name: NameSchema });
const ItemBodySchema = z.object({
  quantity: z.number().int().min(1).max(99).optional(),
  // A blank note clears it, like an explicit null.
  note: z
    .string()
    .trim()
    .max(500)
    .transform((note) => (note === "" ? null : note))
    .nullable()
    .optional(),
});

type SignedInContext = Context<SignedInEnv>;

/**
 * The signed-in user's cart endpoints, mounted under /api behind `requireUser`
 * (contract shared with the web app and the extension's Cart tab):
 * GET|POST /carts, GET|PATCH|DELETE /carts/:id, PUT|DELETE /carts/:id/items/:productId,
 * POST|DELETE /carts/:id/share.
 *
 * @example app.route("/api", createCartRoutes({ carts, repository, logger }))
 */
export function createCartRoutes(deps: CartRouteDependencies): Hono<SignedInEnv> {
  return new Hono<SignedInEnv>()
    .get("/carts", async (c) => c.json({ carts: await deps.carts.listCarts(userIdOf(c)) }))
    .post("/carts", (c) => createCart(c, deps))
    .get("/carts/:id", (c) => showCart(c, deps))
    .patch("/carts/:id", (c) => renameCart(c, deps))
    .delete("/carts/:id", (c) => deleteCart(c, deps))
    .put("/carts/:id/items/:productId", (c) => putItem(c, deps))
    .delete("/carts/:id/items/:productId", (c) => removeItem(c, deps))
    .post("/carts/:id/share", (c) => createShare(c, deps))
    .delete("/carts/:id/share", (c) => revokeShare(c, deps));
}

async function createCart(c: SignedInContext, deps: CartRouteDependencies): Promise<Response> {
  const body = parseCartBody(NameBodySchema, await readJsonBody(c), '{"name": "<text>"}');
  const cart = await deps.carts.createCart(userIdOf(c), body.name);
  deps.logger.info("cart.created", { id: cart.id });
  return c.json({ cart }, 201);
}

async function showCart(c: SignedInContext, deps: CartRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const cart = await deps.carts.findCart(userIdOf(c), id);
  return cart === null ? cartNotFound(c, id) : c.json({ cart });
}

async function renameCart(c: SignedInContext, deps: CartRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const body = parseCartBody(NameBodySchema, await readJsonBody(c), '{"name": "<text>"}');
  const cart = await deps.carts.renameCart(userIdOf(c), id, body.name);
  return cart === null ? cartNotFound(c, id) : c.json({ cart });
}

async function deleteCart(c: SignedInContext, deps: CartRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  if (!(await deps.carts.deleteCart(userIdOf(c), id))) return cartNotFound(c, id);
  deps.logger.info("cart.deleted", { id });
  return c.body(null, 204);
}

async function putItem(c: SignedInContext, deps: CartRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const productId = c.req.param("productId") ?? "";
  const body = parseCartBody(ItemBodySchema, await readJsonBody(c), '{"quantity"?: 1-99, "note"?: "<text>" | null}');
  if ((await deps.repository.findProductById(userIdOf(c), productId)) === null) return productNotFound(c, productId);
  const cart = await deps.carts.putItem(userIdOf(c), id, productId, body);
  return cart === null ? cartNotFound(c, id) : c.json({ cart });
}

async function removeItem(c: SignedInContext, deps: CartRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const cart = await deps.carts.removeItem(userIdOf(c), id, c.req.param("productId") ?? "");
  return cart === null ? cartNotFound(c, id) : c.json({ cart });
}

async function createShare(c: SignedInContext, deps: CartRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const slug = await deps.carts.createShare(userIdOf(c), id);
  if (slug === null) return cartNotFound(c, id);
  deps.logger.info("cart.shared", { id });
  return c.json({ slug });
}

async function revokeShare(c: SignedInContext, deps: CartRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  if (!(await deps.carts.revokeShare(userIdOf(c), id))) return cartNotFound(c, id);
  deps.logger.info("cart.share_revoked", { id });
  return c.body(null, 204);
}

function userIdOf(c: SignedInContext): string {
  return c.get("user").id;
}

/**
 * Validates a cart route body, or throws a 400 that shows what was sent and what was expected.
 *
 * @example parseCartBody(NameBodySchema, await readJsonBody(c), '{"name": "<text>"}')
 */
export function parseCartBody<T>(schema: z.ZodType<T>, body: unknown, expected: string): T {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new BadRequestError(`Cart body ${JSON.stringify(body)} is invalid; expected ${expected}`);
}

/**
 * The 404 for a cart id that is unknown or another user's (the two look the same).
 *
 * @example return cart === null ? cartNotFound(c, id) : c.json({ cart })
 */
export function cartNotFound(c: Context, id: string): Response {
  return c.json({ error: "NotFound", message: `No cart with id "${id}"` }, 404);
}

function productNotFound(c: Context, id: string): Response {
  return c.json({ error: "NotFound", message: `No product with id "${id}"` }, 404);
}
