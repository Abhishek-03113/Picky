import type {
  CatalogCartDetail,
  CatalogCartSummary,
  CatalogComparisonSummary,
  CatalogProduct,
  ProductSnapshot,
} from "@picky/catalog";

/** What Quick Look shows: every comparison, the selected one in full. Plain JSON: it crosses worlds. */
export interface QuickLookState {
  /** False when nobody is signed in to Picky: no comparisons to show, and Compare offers to sign in. */
  signedIn: boolean;
  comparisons: CatalogComparisonSummary[];
  selectedId: string | null;
  products: CatalogProduct[];
  webBaseUrl: string;
}

/** Content script (Quick Look overlay) → service worker. The worker owns all API access, so page CORS never applies. */
export type QuickLookRequest =
  | { type: "quicklook:init" }
  | { type: "quicklook:select"; comparisonId: string }
  /** `comparisonId: null` creates a comparison (named after the snapshot's category) and adds the page to it. */
  | { type: "quicklook:add"; comparisonId: string | null; snapshot: ProductSnapshot }
  | { type: "quicklook:remove"; comparisonId: string; productId: string };

/** What Quick Look's Cart view shows: every cart, the selected one in full. Plain JSON: it crosses worlds. */
export interface CartState {
  /** False when nobody is signed in to Picky: no carts to show, and the Cart view offers to sign in. */
  signedIn: boolean;
  carts: CatalogCartSummary[];
  selectedId: string | null;
  cart: CatalogCartDetail | null;
  webBaseUrl: string;
}

/** Content script (Quick Look's Cart view and "Add to cart") → service worker. */
export type CartRequest =
  | { type: "cart:init" }
  | { type: "cart:select"; cartId: string }
  /** `cartId: null` adds to the last-used cart (the server's "My cart" when there is no other). */
  | { type: "cart:add"; cartId: string | null; snapshot: ProductSnapshot }
  /** A quantity below 1 removes the item. */
  | { type: "cart:set-quantity"; cartId: string; productId: string; quantity: number }
  | { type: "cart:remove"; cartId: string; productId: string };

/** Alt+click on a product link (content script) → service worker. */
export interface LinkAddRequest {
  type: "link:add";
  url: string;
  label: string;
}

/** Web app bridge (content script on the Picky web app) → service worker: import a pasted product link. */
export interface WebImportRequest {
  type: "web:import-link";
  url: string;
}

/** Toast buttons → service worker. */
export type ToastActionRequest =
  | { type: "toast:quicklook" }
  | { type: "toast:undo"; comparisonId: string; productId: string }
  | { type: "toast:open-cart" }
  /** Takes back an "Add to cart": back to `previousQuantity`, or out of the cart when that is 0. */
  | { type: "toast:undo-cart"; cartId: string; productId: string; previousQuantity: number };

export type ExtensionRequest = QuickLookRequest | CartRequest | LinkAddRequest | WebImportRequest | ToastActionRequest;

export type ExtensionResponse<Body> = { ok: true; body: Body } | { ok: false; message: string };

const REQUEST_TYPES: ReadonlySet<string> = new Set([
  "quicklook:init",
  "quicklook:select",
  "quicklook:add",
  "quicklook:remove",
  "cart:init",
  "cart:select",
  "cart:add",
  "cart:set-quantity",
  "cart:remove",
  "link:add",
  "web:import-link",
  "toast:quicklook",
  "toast:undo",
  "toast:open-cart",
  "toast:undo-cart",
]);

/**
 * Shallow check that an incoming runtime message is one of ours (field shapes are trusted: only our own
 * scripts can message the worker).
 *
 * @example isExtensionRequest({ type: "quicklook:init" }) // true
 */
export function isExtensionRequest(message: unknown): message is ExtensionRequest {
  if (typeof message !== "object" || message === null) return false;
  const type = (message as { type?: unknown }).type;
  return typeof type === "string" && REQUEST_TYPES.has(type);
}
