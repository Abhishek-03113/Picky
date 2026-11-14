import { parseMoney } from "../../money/parse-money.ts";
import { findFirst, firstText, type PageNode } from "../../page/page-node.ts";
import type { Spec, SpecGroup } from "../../product-snapshot.ts";
import { textOrNull } from "../../text/normalize-text.ts";
import { namedSource, type LayeredSource } from "../shared/layered-reader.ts";
import { mergeSpecGroupsByTitle } from "../shared/spec-sections.ts";

const TITLE_SELECTORS = ['h1[data-test="product-title"]', '[data-test="product-title"]'] as const;
const PRICE_SELECTORS = ['[data-test="product-price"]'] as const;
const SPECIFICATIONS = '[data-test="item-details-specifications"]';
const TRAILING_COLON = /\s*:\s*$/;
const LEADING_COLON = /^\s*:\s*/;

/**
 * Title and price as Target renders them (`data-test` hooks). `currency` is used for prices without a
 * symbol; a "$15.00 - $20.00" range reads as its low end.
 *
 * @example targetDomSource("USD")(page) // { title: "Apple AirPods Pro", price: { amount: 199.99, currency: "USD" } }
 */
export function targetDomSource(currency: string): LayeredSource {
  return namedSource("target-dom", (page) => {
    const price = firstText(page, PRICE_SELECTORS);
    return {
      title: firstText(page, TITLE_SELECTORS) ?? undefined,
      price: (price === null ? null : parseMoney(price, currency)) ?? undefined,
    };
  });
}

/**
 * The "Specifications" block of Target's item details as one group: each row is a `div` holding
 * `<b>Label:</b> value`. Wrapper divs (several labels) and rows without a value are skipped; [] when the
 * block is missing.
 *
 * @example readTargetSpecGroups(page) // [{ title: "Specifications", specs: [{ label: "Dimensions (Overall)", value: "4 Inches" }] }]
 */
export function readTargetSpecGroups(page: PageNode): SpecGroup[] {
  const block = findFirst(page, SPECIFICATIONS);
  if (block === null) return [];
  const specs = block
    .findAll("div")
    .map(readTargetSpecRow)
    .filter((spec): spec is Spec => spec !== null);
  return mergeSpecGroupsByTitle([{ title: "Specifications", specs }]);
}

/**
 * One `<div><b>Label:</b> value</div>` row, or null when the div is not exactly one labelled row.
 *
 * @example readTargetSpecRow(div) // { label: "Material", value: "Plastic" }
 */
export function readTargetSpecRow(row: PageNode): Spec | null {
  const labels = row.findAll("b");
  if (labels.length !== 1) return null;
  const labelText = labels[0]?.text() ?? "";
  const rowText = row.text();
  if (labelText === "" || !rowText.startsWith(labelText)) return null;
  const label = textOrNull(labelText.replace(TRAILING_COLON, ""));
  const value = textOrNull(rowText.slice(labelText.length).replace(LEADING_COLON, ""));
  return label === null || value === null ? null : { label, value };
}
