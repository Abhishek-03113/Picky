import type { SQL } from "bun";
import type { Hono } from "hono";
import { AuthService } from "./auth/auth-service.ts";
import { PostgresCartRepository } from "./carts/postgres-cart-repository.ts";
import { PostgresLibrarySnapshotReader } from "./carts/postgres-library-snapshot-reader.ts";
import { bunPasswordHasher } from "./auth/password-hasher.ts";
import { PostgresAccountRepository } from "./auth/postgres-account-repository.ts";
import type { ApiConfig } from "./config/api-config.ts";
import type { DecisionModel } from "./decisions/decision-model.ts";
import { createApp } from "./http/create-app.ts";
import type { Logger } from "./logging/json-logger.ts";
import { PostgresComparisonRepository } from "./comparisons/postgres-comparison-repository.ts";
import { PostgresPriceObservationRepository } from "./prices/postgres-price-observation-repository.ts";
import { PostgresProductRepository } from "./products/postgres-product-repository.ts";
import { ProductIngestion } from "./products/product-ingestion.ts";

/**
 * Wires the real repositories and the optional Laya decision model into the HTTP app.
 * Shared by the long-running server (main.ts) and the Vercel function entry (index.ts).
 *
 * @example const app = await composeApi(loadApiConfig(Bun.env), logger, new SQL(url))
 */
export async function composeApi(config: ApiConfig, logger: Logger, sql: SQL): Promise<Hono> {
  const auth = new AuthService(new PostgresAccountRepository(sql), bunPasswordHasher, () => new Date());
  const repository = new PostgresProductRepository(sql);
  const priceObservations = new PostgresPriceObservationRepository(sql);
  const ingestion = new ProductIngestion(repository, priceObservations);
  const decisionModel = await loadDecisionModel(config.decisionModelDir);
  logger.info("decisions.model", { dir: config.decisionModelDir, loaded: decisionModel !== undefined });
  const comparisons = new PostgresComparisonRepository(sql);
  // Secure cookies need https; local dev serves the web app over plain http://localhost.
  const sessionCookie = { secure: new URL(config.webOrigin).protocol === "https:" };
  return createApp({
    auth,
    sessionCookie,
    repository,
    comparisons,
    carts: new PostgresCartRepository(sql),
    library: new PostgresLibrarySnapshotReader(sql),
    ingestion,
    priceObservations,
    logger,
    webOrigin: config.webOrigin,
    decisionModel,
  });
}

// Imported lazily so deployments without a model (Vercel) never load onnxruntime-node's native binary.
async function loadDecisionModel(modelDir: string | null): Promise<DecisionModel | undefined> {
  if (modelDir === null) return undefined;
  const { loadLayaDecisionModel } = await import("./decisions/load-laya-model.ts");
  return loadLayaDecisionModel(modelDir);
}
