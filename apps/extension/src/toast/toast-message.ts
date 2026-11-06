/** One in-page toast. `id` identifies a link capture, so "Reading…" is replaced by its result. Plain JSON. */
export type ToastMessage =
  | { kind: "reading"; id: string; title: string; destination: string }
  | {
      kind: "added";
      id: string;
      title: string;
      specCount: number;
      /** Where it went; null for "Library only". */
      placement: { comparisonName: string; count: number } | null;
      undo: { comparisonId: string; productId: string } | null;
    }
  | { kind: "failed"; id: string; reason: string };

declare global {
  var pickyToast: ((message: ToastMessage) => void) | undefined;
}

/**
 * The toast's second line: where the product went.
 *
 * @example addedDetail({ specCount: 54, placement: { comparisonName: "Monitors", count: 5 } }) // "54 details · now 5 in Monitors"
 */
export function addedDetail(message: Extract<ToastMessage, { kind: "added" }>): string {
  const details = `${message.specCount} details`;
  if (message.placement === null) return `${details} · saved to Picky`;
  return `${details} · now ${message.placement.count} in ${message.placement.comparisonName}`;
}
