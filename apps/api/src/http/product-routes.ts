import { Hono, type Context } from "hono";
import type { Logger } from "../logging/json-logger.ts";
import type { ProductIngestion } from "../products/product-ingestion.ts";
import type { ProductRepository } from "../products/product-repository.ts";
import { readJsonBody } from "./read-json-body.ts";
import type { SignedInEnv } from "./session-cookie.ts";

export interface ProductRouteDependencies {
  repository: ProductRepository;
  ingestion: ProductIngestion;
  logger: Logger;
}

/**
 * Product endpoints of the signed-in user's library, mounted under /api behind `requireUser`:
 * POST /snapshots (extension capture), GET /products (optional ?q= search), GET /products/:id, DELETE /products/:id.
 *
 * @example app.route("/api", createProductRoutes({ repository, ingestion, logger }))
 */
export function createProductRoutes(deps: ProductRouteDependencies): Hono<SignedInEnv> {
  return new Hono<SignedInEnv>()
    .post("/snapshots", (c) => captureSnapshot(c, deps))
    .get("/products", (c) => listProducts(c, deps))
    .get("/products/:id", (c) => showProduct(c, deps))
    .delete("/products/:id", (c) => deleteProduct(c, deps));
}

async function captureSnapshot(c: Context<SignedInEnv>, deps: ProductRouteDependencies): Promise<Response> {
  const product = await deps.ingestion.ingestSnapshot(c.get("user").id, await readJsonBody(c));
  deps.logger.info("product.captured", { id: product.id, externalId: product.snapshot.externalId });
  return c.json({ product }, 201);
}

async function listProducts(c: Context<SignedInEnv>, deps: ProductRouteDependencies): Promise<Response> {
  const products = await deps.repository.listProductSummaries(c.get("user").id, c.req.query("q") ?? "");
  return c.json({ products });
}

async function showProduct(c: Context<SignedInEnv>, deps: ProductRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  const product = await deps.repository.findProductById(c.get("user").id, id);
  if (product === null) return c.json({ error: "NotFound", message: `No product with id "${id}"` }, 404);
  return c.json({ product });
}

async function deleteProduct(c: Context<SignedInEnv>, deps: ProductRouteDependencies): Promise<Response> {
  const id = c.req.param("id") ?? "";
  if (!(await deps.repository.deleteProduct(c.get("user").id, id)))
    return c.json({ error: "NotFound", message: `No product with id "${id}"` }, 404);
  deps.logger.info("product.deleted", { id });
  return c.body(null, 204);
}
