import type { PageNode } from "../../page/page-node.ts";
import type { SpecGroup } from "../../product-snapshot.ts";
import { readSpecRows } from "../shared/spec-sections.ts";

const ITEM_SPECIFICS_ROWS = {
  row: ".ux-layout-section-evo__item, .ux-labels-values",
  label: ".ux-labels-values__labels, .ux-labels-values__labels-content",
  value: ".ux-labels-values__values, .ux-labels-values__values-content",
} as const;

/**
 * Reads eBay's "Item specifics" label/value pairs into one group; empty when there are none.
 *
 * @example extractEbaySpecGroups(page) // [{ title: "Item specifics", specs: [{ label: "Brand", value: "Apple" }] }]
 */
export function extractEbaySpecGroups(page: PageNode): SpecGroup[] {
  const seen = new Set<string>();
  const specs = readSpecRows(page, ITEM_SPECIFICS_ROWS).filter((spec) => !seen.has(spec.label) && seen.add(spec.label));
  return specs.length === 0 ? [] : [{ title: "Item specifics", specs }];
}
