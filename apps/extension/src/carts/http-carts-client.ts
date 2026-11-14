import type { CartItemInput, CatalogCartDetail, CatalogCartSummary } from "@picky/catalog";
import { needsSignIn, SignInRequiredError } from "../sign-in-required.ts";
import type { CartsClient } from "./carts-client.ts";

type FetchFunction = (input: string, init: RequestInit) => Promise<Response>;
type JsonRecord = Readonly<Record<string, unknown>>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : null;
}

/**
 * CartsClient over the Picky HTTP API, as the user signed in to the web app (its session cookie goes
 * along). A 401 throws SignInRequiredError; other failures throw with the method, path and the API's
 * message (or status), so toasts and the Cart view can say what went wrong.
 *
 * @example const carts = await new HttpCartsClient(fetch, "http://localhost:8787").list()
 */
export class HttpCartsClient implements CartsClient {
  constructor(
    private readonly fetchFunction: FetchFunction,
    private readonly apiBaseUrl: string,
  ) {}

  async list(): Promise<CatalogCartSummary[]> {
    const body = await this.request("GET", "/api/carts");
    if (!Array.isArray(body.carts)) throw this.malformed("GET", "/api/carts", "carts: []", body);
    return body.carts as CatalogCartSummary[];
  }

  async find(cartId: string): Promise<CatalogCartDetail> {
    const path = this.cartPath(cartId);
    return this.cartFrom("GET", path, await this.request("GET", path)) as unknown as CatalogCartDetail;
  }

  async create(name: string): Promise<CatalogCartSummary> {
    const body = await this.request("POST", "/api/carts", { name });
    return this.cartFrom("POST", "/api/carts", body) as unknown as CatalogCartSummary;
  }

  async putItem(cartId: string, productId: string, input: CartItemInput): Promise<CatalogCartSummary> {
    const path = this.itemPath(cartId, productId);
    return this.cartFrom("PUT", path, await this.request("PUT", path, input)) as unknown as CatalogCartSummary;
  }

  async removeItem(cartId: string, productId: string): Promise<CatalogCartSummary> {
    const path = this.itemPath(cartId, productId);
    return this.cartFrom("DELETE", path, await this.request("DELETE", path)) as unknown as CatalogCartSummary;
  }

  private cartPath(cartId: string): string {
    return `/api/carts/${encodeURIComponent(cartId)}`;
  }

  private itemPath(cartId: string, productId: string): string {
    return `${this.cartPath(cartId)}/items/${encodeURIComponent(productId)}`;
  }

  /** The `cart` object every cart endpoint but the list answers with; it must carry an id, a name and items. */
  private cartFrom(method: string, path: string, body: JsonRecord): JsonRecord {
    const cart = asRecord(body.cart);
    if (typeof cart?.id !== "string" || typeof cart.name !== "string" || !Array.isArray(cart.items)) {
      throw this.malformed(method, path, "{ cart: { id, name, items: [] } }", body);
    }
    return cart;
  }

  private async request(method: string, path: string, payload?: unknown): Promise<JsonRecord> {
    // Bare call: the browser's fetch throws "Illegal invocation" when invoked as a method of this client.
    const { fetchFunction } = this;
    const response = await fetchFunction(`${this.apiBaseUrl}${path}`, {
      method,
      headers: payload === undefined ? {} : { "content-type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      credentials: "include",
    });
    if (needsSignIn(response)) throw new SignInRequiredError();
    const body = asRecord(await response.json().catch(() => null)) ?? {};
    if (response.ok) return body;
    const reason = typeof body.message === "string" ? body.message : `HTTP ${response.status}`;
    throw new Error(`Picky API ${method} ${path} failed: ${reason}`);
  }

  private malformed(method: string, path: string, expected: string, received: unknown): Error {
    return new Error(`Picky API ${method} ${path} returned ${JSON.stringify(received)}; expected ${expected}`);
  }
}
