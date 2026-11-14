import { firstText, type PageNode } from "../../page/page-node.ts";

// The twister rows Amazon shows above the buy box, in the order the page lists them.
const VARIATION_ROWS = [
  "#variation_color_name",
  "#variation_size_name",
  "#variation_style_name",
  "#variation_pattern_name",
] as const;
// An unchosen dropdown reads "Select" rather than an option.
const UNCHOSEN = /^select\b/i;

/**
 * The selected options of an Amazon product (colour, size, style, pattern), joined with ", "; null when
 * the page has no selected variation.
 *
 * @example extractAmazonVariant(page) // "Midnight Black, 256 GB"
 */
export function extractAmazonVariant(page: PageNode): string | null {
  const options = VARIATION_ROWS.map((row) =>
    firstText(page, [`${row} .selection`, `${row} .a-dropdown-prompt`]),
  ).filter((option): option is string => option !== null && !UNCHOSEN.test(option));
  return options.length === 0 ? null : options.join(", ");
}
