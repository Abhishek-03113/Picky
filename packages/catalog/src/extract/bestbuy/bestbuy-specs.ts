import type { PageNode } from "../../page/page-node.ts";
import type { Spec, SpecGroup } from "../../product-snapshot.ts";
import { readSpecRows } from "../shared/spec-sections.ts";

const ROW_LAYOUTS = [
  { row: ".specification-row", label: ".row-title, [class*='title']", value: ".row-value, [class*='value']" },
  { row: '[data-testid="specifications"] li', label: "[class*='label'], [class*='title']", value: "[class*='value']" },
] as const;

/**
 * Reads Best Buy's specifications list into one "Specifications" group; empty when the page lists none.
 *
 * @example extractBestBuySpecGroups(page) // [{ title: "Specifications", specs: [{ label: "Screen Size", value: "55 inches" }] }]
 */
export function extractBestBuySpecGroups(page: PageNode): SpecGroup[] {
  const specs = dedupeByLabel(ROW_LAYOUTS.flatMap((layout) => readSpecRows(page, layout)));
  return specs.length === 0 ? [] : [{ title: "Specifications", specs }];
}

function dedupeByLabel(specs: readonly Spec[]): Spec[] {
  const seen = new Set<string>();
  return specs.filter((spec) => !seen.has(spec.label) && seen.add(spec.label));
}
