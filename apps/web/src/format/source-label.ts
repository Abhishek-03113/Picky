import { shoppingStores } from "@picky/catalog/sites";

/** "all", or a store name such as "Amazon" (which covers every Amazon storefront). */
export type StoreFilter = "all" | string;

export interface StoreFilterOption {
  value: StoreFilter;
  label: string;
}

/**
 * Segments for the library's store filter: "All" first, then one per store.
 *
 * @example storeFilterOptions().map((option) => option.label) // ["All", "Amazon", "Flipkart"]
 */
export function storeFilterOptions(): StoreFilterOption[] {
  return [
    { value: "all", label: "All" },
    ...shoppingStores().map((store) => ({ value: store.name, label: store.name })),
  ];
}
