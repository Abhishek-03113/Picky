import type { CartItemInput, CatalogCartDetail, CatalogCartSummary } from "@picky/catalog";
import { createJsonRequester, jsonRequest, type FetchFunction } from "./json-requester.ts";

export interface CartsClient {
  /** Most recently updated first. */
  listCarts(): Promise<CatalogCartSummary[]>;
  getCart(id: string): Promise<CatalogCartDetail>;
  createCart(name: string): Promise<CatalogCartSummary>;
  renameCart(id: string, name: string): Promise<CatalogCartSummary>;
  deleteCart(id: string): Promise<void>;
  /** Adds the product, or changes its quantity or note. Omitted fields keep their value; a new item gets quantity 1. */
  setItem(cartId: string, productId: string, input?: CartItemInput): Promise<CatalogCartSummary>;
  removeItem(cartId: string, productId: string): Promise<CatalogCartSummary>;
}

type SummaryEnvelope = { cart: CatalogCartSummary };

/**
 * Typed client for the cart endpoints of the Picky API.
 *
 * @example await createCartsClient(fetch, "").setItem(cartId, productId, { quantity: 2 })
 */
export function createCartsClient(fetchFunction: FetchFunction, baseUrl: string): CartsClient {
  const requestJson = createJsonRequester(fetchFunction, baseUrl);
  const path = (id: string) => `/api/carts/${encodeURIComponent(id)}`;
  const itemPath = (id: string, productId: string) => `${path(id)}/items/${encodeURIComponent(productId)}`;
  const summary = async (route: string, init?: RequestInit) => (await requestJson<SummaryEnvelope>(route, init)).cart;
  return {
    listCarts: async () => (await requestJson<{ carts: CatalogCartSummary[] }>("/api/carts")).carts,
    getCart: async (id) => (await requestJson<{ cart: CatalogCartDetail }>(path(id))).cart,
    createCart: (name) => summary("/api/carts", jsonRequest("POST", { name })),
    renameCart: (id, name) => summary(path(id), jsonRequest("PATCH", { name })),
    deleteCart: (id) => requestJson<void>(path(id), { method: "DELETE" }),
    setItem: (id, productId, input = {}) => summary(itemPath(id, productId), jsonRequest("PUT", input)),
    removeItem: (id, productId) => summary(itemPath(id, productId), { method: "DELETE" }),
  };
}
