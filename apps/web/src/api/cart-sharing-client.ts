import type { CatalogCartSummary, SharedCartView } from "@picky/catalog";
import { createJsonRequester, jsonRequest, type FetchFunction } from "./json-requester.ts";

/** What an import or a restore did. */
export interface ImportCartResult {
  cart: CatalogCartSummary;
  added: number;
  merged: number;
}

export interface ImportCartRequest {
  /** A share slug to copy a shared cart from. */
  slug?: string;
  /** A Picky file's contents. */
  backup?: object;
  /** Merge into this cart; null or omitted makes a new one. */
  cartId?: string | null;
  name?: string;
}

export interface RestoreResult {
  products: number;
  comparisons: number;
  carts: number;
  skipped: number;
}

export type ExportFormat = "json" | "csv";

export interface CartSharingClient {
  /** Turns sharing on (or returns the live link's slug). */
  share(cartId: string): Promise<string>;
  unshare(cartId: string): Promise<void>;
  /** Public: works signed out. Rejects with a 404 ApiRequestError once the link is turned off. */
  readShared(slug: string): Promise<SharedCartView>;
  importCart(request: ImportCartRequest): Promise<ImportCartResult>;
  /** A link the browser can open to download the file. */
  exportUrl(cartId: string, format: ExportFormat): string;
  /** The whole library as a Picky file. */
  backup(): Promise<object>;
  restore(backup: object): Promise<RestoreResult>;
}

/**
 * Typed client for the share, import, export and backup endpoints of the Picky API.
 *
 * @example const slug = await createCartSharingClient(fetch, "").share(cartId)
 */
export function createCartSharingClient(fetchFunction: FetchFunction, baseUrl: string): CartSharingClient {
  const requestJson = createJsonRequester(fetchFunction, baseUrl);
  const cartPath = (id: string) => `/api/carts/${encodeURIComponent(id)}`;
  return {
    share: async (cartId) => (await requestJson<{ slug: string }>(`${cartPath(cartId)}/share`, { method: "POST" })).slug,
    unshare: (cartId) => requestJson<void>(`${cartPath(cartId)}/share`, { method: "DELETE" }),
    readShared: async (slug) =>
      (await requestJson<{ cart: SharedCartView }>(`/api/shared-carts/${encodeURIComponent(slug)}`)).cart,
    importCart: (request) => requestJson<ImportCartResult>("/api/carts/import", jsonRequest("POST", request)),
    exportUrl: (cartId, format) => `${baseUrl}${cartPath(cartId)}/export?format=${format}`,
    backup: () => requestJson<object>("/api/backup"),
    restore: (backup) => requestJson<RestoreResult>("/api/backup", jsonRequest("POST", backup)),
  };
}
