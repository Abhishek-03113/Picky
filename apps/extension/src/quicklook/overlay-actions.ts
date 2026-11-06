import type { ReadColorOption } from "../link-capture/color-page-reader.ts";
import type { QuickLookView } from "./quicklook-model.ts";

/** What the overlay's controls can ask for; implemented by QuickLookController. */
export interface OverlayActions {
  close(): void;
  select(comparisonId: string): void;
  setView(view: QuickLookView): void;
  removeProduct(productId: string): void;
  addPage(): void;
  retry(): void;
  /** Reads a colour the snapshot has no price for, so picking it fills the preview in place; null when unavailable. */
  readonly readColor: ReadColorOption | null;
}
