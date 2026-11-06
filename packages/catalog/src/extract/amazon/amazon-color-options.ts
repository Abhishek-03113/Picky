import type { PageNode } from "../../page/page-node.ts";
import type { ColorOption } from "../../product-snapshot.ts";
import type { SupportedSite } from "../../sites/shopping-sites.ts";
import { textOrNull } from "../../text/normalize-text.ts";
import { canonicalAmazonUrl } from "./amazon-url.ts";

// The colour row of Amazon's variation picker ("twister"). Each swatch names its own listing in
// data-asin: picking a colour navigates to that ASIN's page (seen on B076CKF1GB, B07FLNVWB5).
const COLOR_SWATCHES = "#inline-twister-row-color_name li[data-asin]";
const SWATCH_NAMES = ".swatch-title-text-display, .a-button-text";

/** What the page itself says about its own colour; the other colours need their own pages read. */
export interface SelectedColorDetails {
  price: ColorOption["price"];
  availability: ColorOption["availability"];
  image: ColorOption["image"];
}

/**
 * Lists the colours a product comes in, one per listing. The page's own colour carries its details;
 * the others start without price, availability or image. Fewer than two colours is no choice: [].
 *
 * @example extractAmazonColorOptions(page, site, details).map((option) => option.name) // ["White", "Blue", …]
 */
export function extractAmazonColorOptions(
  page: PageNode,
  site: SupportedSite,
  selected: SelectedColorDetails,
): ColorOption[] {
  const options = distinctByAsin(page.findAll(COLOR_SWATCHES))
    .map((swatch) => readSwatch(swatch, site, selected))
    .filter((option): option is ColorOption => option !== null);
  return options.length < 2 ? [] : options;
}

function distinctByAsin(swatches: readonly PageNode[]): PageNode[] {
  const seen = new Set<string>();
  return swatches.filter((swatch) => {
    const asin = swatch.attr("data-asin") ?? "";
    if (asin === "" || seen.has(asin)) return false;
    seen.add(asin);
    return true;
  });
}

function readSwatch(swatch: PageNode, site: SupportedSite, details: SelectedColorDetails): ColorOption | null {
  const asin = swatch.attr("data-asin") ?? "";
  const image = swatch.findAll("img")[0] ?? null;
  const name = textOrNull(image?.attr("alt")) ?? swatch.findAll(SWATCH_NAMES).map((node) => node.text())[0];
  if (!name) return null;
  const selected = swatch.attr("data-initiallyselected") === "true";
  const swatchImage = image?.attr("src") ?? null;
  return {
    name,
    externalId: asin,
    url: canonicalAmazonUrl(asin, site),
    swatchImage: swatchImage?.startsWith("https://") ? swatchImage : null,
    selected,
    ...(selected ? details : { price: null, availability: null, image: null }),
  };
}
