import { storeBrandsText } from "@picky/catalog/sites";
/** How the library can be sectioned. */
export const GROUP_KEYS = ["category", "brand", "store", "price", "none"] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const DEFAULT_GROUP_KEY: GroupKey = "category";

export interface GroupOption {
  key: GroupKey;
  label: string;
  hint: string;
}

/** Menu entries in display order; a full list so a new GroupKey cannot be left out of the menu. */
export const GROUP_OPTIONS: readonly GroupOption[] = [
  { key: "category", label: "Category", hint: "The store’s category, e.g. Monitors" },
  { key: "brand", label: "Brand", hint: "LG, Dell, Samsung…" },
  { key: "store", label: "Store", hint: storeBrandsText() },
  { key: "price", label: "Price range", hint: "Under ₹25k, ₹25–35k, over ₹35k" },
  { key: "none", label: "Newest first", hint: "Everything in one list" },
];

/**
 * Narrows an untrusted `?group=` value to a GroupKey, or undefined for anything else.
 *
 * @example parseGroupKey("brand") // "brand"
 */
export function parseGroupKey(candidate: unknown): GroupKey | undefined {
  return GROUP_KEYS.find((key) => key === candidate);
}

/**
 * Label of the active grouping, for the menu button.
 *
 * @example groupLabel("price") // "Price range"
 */
export function groupLabel(key: GroupKey): string {
  return GROUP_OPTIONS.find((option) => option.key === key)?.label ?? key;
}
