import { Hono } from "hono";
import { buildBackup, readBackup, restoreBackup, type CartBackupDependencies } from "../carts/cart-backup.ts";
import type { Logger } from "../logging/json-logger.ts";
import { BadRequestError } from "./http-errors.ts";
import { readJsonBody } from "./read-json-body.ts";
import type { SignedInEnv } from "./session-cookie.ts";

export interface BackupRouteDependencies extends CartBackupDependencies {
  logger: Logger;
}

/**
 * The signed-in user's whole-account backup, mounted under /api behind `requireUser`:
 * GET /backup → a `CartBackupV1` file (every cart, comparison and product);
 * POST /backup with that file → restores by merging, `{ products, comparisons, carts, skipped }`.
 * A file from a newer Picky (version > 1) is a 400 that says so.
 *
 * @example app.route("/api", createBackupRoutes({ carts, comparisons, ingestion, library, logger }))
 */
export function createBackupRoutes(deps: BackupRouteDependencies): Hono<SignedInEnv> {
  return new Hono<SignedInEnv>()
    .get("/backup", async (c) => {
      const now = new Date();
      c.header("Content-Disposition", `attachment; filename="picky-backup-${now.toISOString().slice(0, 10)}.json"`);
      return c.json(await buildBackup(deps, c.get("user").id, now));
    })
    .post("/backup", async (c) => {
      const read = readBackup(await readJsonBody(c));
      if (!read.ok) throw new BadRequestError(read.reason);
      const result = await restoreBackup(deps, c.get("user").id, read.backup);
      deps.logger.info("backup.restored", { ...result });
      return c.json(result);
    });
}
