import type { CartItem, CatalogCartDetail } from "@picky/catalog";

const COLUMNS = ["store", "title", "variant", "quantity", "price", "currency", "link"] as const;

/**
 * A cart as CSV (RFC 4180: every field quoted, CRLF line ends), one row per item with its current price.
 *
 * @example cartToCsv(cart).split("\r\n")[0] // '"store","title","variant","quantity","price","currency","link"'
 */
export function cartToCsv(cart: CatalogCartDetail): string {
  const rows = [COLUMNS, ...cart.items.map(toRow)];
  return rows.map((row) => row.map(quoteField).join(",")).join("\r\n") + "\r\n";
}

function toRow(item: CartItem): string[] {
  const { snapshot } = item.product;
  return [
    snapshot.source,
    snapshot.title,
    snapshot.variant ?? "",
    String(item.quantity),
    snapshot.price === null ? "" : String(snapshot.price.amount),
    snapshot.price?.currency ?? "",
    snapshot.url,
  ];
}

function quoteField(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
