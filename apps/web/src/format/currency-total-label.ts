/**
 * The sign shoppers read for a currency: "₹" for INR, "$" for USD; the code itself when there is none.
 *
 * @example currencySymbol("INR") // "₹"
 */
function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat("en-IN", { style: "currency", currency }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

/**
 * The label of a per-currency total row, so two totals in one cart are never both just "Total".
 *
 * @example currencyTotalLabel("INR", 2) // "Items in ₹ (2)"
 */
export function currencyTotalLabel(currency: string, itemCount: number): string {
  return `Items in ${currencySymbol(currency)} (${itemCount})`;
}
