import type { CatalogProduct, ProductSnapshot } from "@picky/catalog";
import type { CartState, QuickLookState } from "../messaging/messages.ts";

/** Which body the overlay shows: the comparison matrix, the open page's own spec sheet, or the cart. */
export type QuickLookView = "compare" | "specs" | "cart";

/** Everything the overlay renders from; the controller replaces it wholesale on each change. */
export interface QuickLookModel {
  status: "loading" | "ready" | "failed";
  /** Reason shown on the failed screen, or as a banner above a still-usable matrix. */
  message: string | null;
  state: QuickLookState | null;
  /** Live snapshot of the open tab, or null when it is not a product page. */
  pageSnapshot: ProductSnapshot | null;
  view: QuickLookView;
  busy: boolean;
  /** The cart is loaded on demand: "idle" until the Cart view or "Add to cart" first needs it. */
  cartStatus: "idle" | "loading" | "ready" | "failed";
  /** Reason shown on the Cart view's failed screen, or as a banner above a still-usable cart. */
  cartMessage: string | null;
  cart: CartState | null;
  cartBusy: boolean;
}

export const INITIAL_MODEL: QuickLookModel = {
  status: "loading",
  message: null,
  state: null,
  pageSnapshot: null,
  view: "specs",
  busy: false,
  cartStatus: "idle",
  cartMessage: null,
  cart: null,
  cartBusy: false,
};

/**
 * The view the overlay really shows. Specs is primary, but a "specs" request without a page snapshot
 * (nothing to show) falls back to compare, so a stale view value can never render an empty sheet.
 *
 * @example effectiveView({ ...INITIAL_MODEL, view: "specs", pageSnapshot: null }) // "compare"
 */
export function effectiveView(model: QuickLookModel): QuickLookView {
  return model.view === "specs" && model.pageSnapshot === null ? "compare" : model.view;
}

/**
 * True when the overlay is showing the open page's spec sheet.
 *
 * @example showsSpecs({ ...INITIAL_MODEL, view: "specs", pageSnapshot: null }) // false
 */
export function showsSpecs(model: QuickLookModel): boolean {
  return effectiveView(model) === "specs";
}

const COMMAND_VIEWS: Readonly<Record<string, QuickLookView>> = { "open-comparison": "compare", "open-cart": "cart" };

/**
 * Maps a manifest command name to the Quick Look view it opens; null for commands that are not ours.
 * `_execute_action` arrives as chrome.action.onClicked instead, so it is not handled here.
 *
 * @example viewForCommand("open-comparison") // "compare"
 * @example viewForCommand("open-cart") // "cart"
 */
export function viewForCommand(command: string): QuickLookView | null {
  return COMMAND_VIEWS[command] ?? null;
}

function isSameProduct(product: CatalogProduct, snapshot: ProductSnapshot): boolean {
  return product.snapshot.source === snapshot.source && product.snapshot.externalId === snapshot.externalId;
}

/**
 * The "Viewing now" column's snapshot: the open tab's product, unless it is already saved in the comparison
 * (then it is just a normal column).
 *
 * @example thisPageColumn(model) // null on a search page or when the product is already saved
 */
export function thisPageColumn(model: QuickLookModel): ProductSnapshot | null {
  const page = model.pageSnapshot;
  if (page === null) return null;
  const saved = model.state?.products ?? [];
  return saved.some((product) => isSameProduct(product, page)) ? null : page;
}

/** The comparison's id one step left/right of the selected one, wrapping around; null with nothing to switch to. */
export function neighbourComparisonId(state: QuickLookState, step: 1 | -1): string | null {
  const ids = state.comparisons.map((comparison) => comparison.id);
  if (ids.length < 2 || state.selectedId === null) return null;
  const index = ids.indexOf(state.selectedId);
  return ids[(index + step + ids.length) % ids.length] ?? null;
}

/**
 * How many of the open page's product the selected cart holds; 0 off a product page, before the cart has
 * loaded, or when it is not in the cart.
 *
 * @example pageCartQuantity(model) // 2 when the cart holds two of this product
 */
export function pageCartQuantity(model: QuickLookModel): number {
  const page = model.pageSnapshot;
  if (page === null) return 0;
  const item = model.cart?.cart?.items.find((cartItem) => isSameProduct(cartItem.product, page));
  return item?.quantity ?? 0;
}

/** The cart's id one step left/right of the selected one, wrapping around; null with nothing to switch to. */
export function neighbourCartId(cart: CartState, step: 1 | -1): string | null {
  const ids = cart.carts.map((summary) => summary.id);
  if (ids.length < 2 || cart.selectedId === null) return null;
  const index = ids.indexOf(cart.selectedId);
  return ids[(index + step + ids.length) % ids.length] ?? null;
}

/** The selected cart's name, or null before the cart has loaded. */
export function selectedCartName(model: QuickLookModel): string | null {
  return model.cart?.cart?.name ?? null;
}
