import type { CatalogComparisonSummary } from "@picky/catalog";
import type { AddTarget } from "./add-target.ts";

/** Right-click on a product link, or on the open product page itself. */
export type MenuContext = "link" | "page";

export interface MenuEntry {
  id: string;
  parentId?: string;
  title: string;
  kind: "normal" | "separator";
  context: MenuContext;
}

/**
 * A clicked item: "Add to Picky" (where the product goes and how it is read), "Add to cart" (into the
 * last-used cart), or "Quick Look" on a link.
 */
export type MenuClick =
  | { action: "add"; target: AddTarget; source: MenuContext }
  | { action: "cart"; source: MenuContext }
  | { action: "quicklook" };

const COMPARISON_PREFIX = "picky:cmp:";
const LIBRARY_ID = "picky:library";
const NEW_ID = "picky:new";
// A look at a linked product without saving it. Links only: on a product page the toolbar's Quick Look shows it.
const QUICKLOOK_ID = "picky:quicklook";
// Into the last-used cart; on the page menu it is a second top-level item ("picky:page:cart").
const CART_ID = "picky:cart";
// The page menu repeats the add items under ids with this prefix, since every menu id must be unique.
const PAGE_ID_PREFIX = "picky:page:";
const PAGE_ROOT_ID = "picky:page:add";

/** Chrome reads "&" in a menu title as an accelerator marker; doubling it shows a literal "&". */
function menuTitle(text: string): string {
  return text.replaceAll("&", "&&");
}

/** Last-used comparison first (labelled), then the others; `prefix` turns "Monitors" into "Add to Monitors". */
function comparisonTitles(
  comparisons: readonly CatalogComparisonSummary[],
  lastUsedId: string | null,
  prefix: string,
): { comparisonId: string; title: string }[] {
  const lastUsed = comparisons.find((comparison) => comparison.id === lastUsedId);
  const ordered = lastUsed === undefined ? comparisons : [lastUsed, ...comparisons.filter((c) => c.id !== lastUsed.id)];
  return ordered.map((comparison) => ({
    comparisonId: comparison.id,
    title: menuTitle(`${prefix}${comparison.name}${comparison.id === lastUsed?.id ? " (last used)" : ""}`),
  }));
}

/**
 * The right-click menus. Chrome shows an extension with several top-level items as one submenu under its
 * name, so the link menu is flat and reads as "Picky ▸ See details | Add to cart | Add to Monitors (last
 * used) | … | Just save it | New comparison…". The page menu has a "Save to Picky ▸" root with the same
 * targets, and an "Add to cart" item beside it.
 *
 * @example buildMenuEntries(comparisons, "c1").filter((e) => e.context === "link").map((e) => e.title)
 * // ["See details", "Add to cart", "", "Add to Monitors (last used)", "Add to Home office", "", "Just save it", "New comparison…"]
 */
export function buildMenuEntries(
  comparisons: readonly CatalogComparisonSummary[],
  lastUsedId: string | null,
): MenuEntry[] {
  return [...linkMenuEntries(comparisons, lastUsedId), ...pageMenuEntries(comparisons, lastUsedId)];
}

function linkMenuEntries(comparisons: readonly CatalogComparisonSummary[], lastUsedId: string | null): MenuEntry[] {
  const item = (id: string, title: string, kind: MenuEntry["kind"] = "normal"): MenuEntry => ({
    id,
    title,
    kind,
    context: "link",
  });
  const comparisonItems = comparisonTitles(comparisons, lastUsedId, "Add to ").map(({ comparisonId, title }) =>
    item(`${COMPARISON_PREFIX}${comparisonId}`, title),
  );
  return [
    item(QUICKLOOK_ID, "See details"),
    item(CART_ID, "Add to cart"),
    item("picky:separator:quicklook", "", "separator"),
    ...comparisonItems,
    ...(comparisonItems.length > 0 ? [item("picky:separator:targets", "", "separator")] : []),
    item(LIBRARY_ID, "Just save it"),
    item(NEW_ID, "New comparison…"),
  ];
}

function pageMenuEntries(comparisons: readonly CatalogComparisonSummary[], lastUsedId: string | null): MenuEntry[] {
  const child = (id: string, title: string, kind: MenuEntry["kind"] = "normal"): MenuEntry => ({
    id: `${PAGE_ID_PREFIX}${id}`,
    parentId: PAGE_ROOT_ID,
    title,
    kind,
    context: "page",
  });
  const comparisonItems = comparisonTitles(comparisons, lastUsedId, "").map(({ comparisonId, title }) =>
    child(`cmp:${comparisonId}`, title),
  );
  return [
    { id: PAGE_ROOT_ID, title: "Save to Picky", kind: "normal", context: "page" },
    ...comparisonItems,
    ...(comparisonItems.length > 0 ? [child("separator", "", "separator")] : []),
    child("library", "Just save it"),
    child("new", "New comparison…"),
    { id: `${PAGE_ID_PREFIX}cart`, title: "Add to cart", kind: "normal", context: "page" },
  ];
}

/**
 * What a clicked menu item means, or null for the page root, separators and foreign items.
 *
 * @example menuClickFromItem("picky:page:library") // { action: "add", target: { kind: "library" }, source: "page" }
 * @example menuClickFromItem("picky:page:cart") // { action: "cart", source: "page" }
 */
export function menuClickFromItem(menuItemId: string | number): MenuClick | null {
  const id = String(menuItemId);
  if (id === QUICKLOOK_ID) return { action: "quicklook" };
  const source: MenuContext = id.startsWith(PAGE_ID_PREFIX) ? "page" : "link";
  const linkId = source === "page" ? `picky:${id.slice(PAGE_ID_PREFIX.length)}` : id;
  if (linkId === CART_ID) return { action: "cart", source };
  const target = addTargetFromMenuItem(linkId);
  return target === null ? null : { action: "add", target, source };
}

function addTargetFromMenuItem(id: string): AddTarget | null {
  if (id === LIBRARY_ID) return { kind: "library" };
  if (id === NEW_ID) return { kind: "new" };
  if (!id.startsWith(COMPARISON_PREFIX)) return null;
  return { kind: "comparison", comparisonId: id.slice(COMPARISON_PREFIX.length) };
}
