import {
  supportedStoresText,
  COMPARE_SHORTCUT,
  QUICK_LOOK_SHORTCUT,
  altClickText,
  shortcutText,
  type OperatingSystem,
} from "@picky/catalog";

/** One step of getting the extension working, shown on /extension and on the empty-library welcome. */
export interface SetupStep {
  readonly title: string;
  readonly hint: string;
}

/** What the extension does on a store page, for the shortcut list on /extension. */
export interface ExtensionGesture {
  readonly keys: string;
  readonly action: string;
}

/**
 * The full walk-through, from the store page to a saved product, with keys named for `os`.
 *
 * @example setupSteps("mac")[3]?.hint // "On Amazon.in, Amazon.com or Flipkart, click Picky or press ⌥⇧S for its specs. ..."
 */
export function setupSteps(os: OperatingSystem): SetupStep[] {
  return [
    {
      title: "Add to Chrome",
      hint: "On the Chrome Web Store page, click Add to Chrome, then Add extension. Edge, Brave and Arc work too.",
    },
    {
      title: "Pin it",
      hint: "Click the puzzle-piece icon in the toolbar, then the pin next to Picky, so it stays one click away.",
    },
    {
      title: "Sign in here",
      hint: "The extension uses your Picky sign-in from this site, so there is nothing to enter twice.",
    },
    {
      title: "Open a product",
      hint: `On ${supportedStoresText("or")}, click Picky or press ${shortcutText(QUICK_LOOK_SHORTCUT, os)} to see every detail. Right-click → Save to Picky keeps it.`,
    },
  ];
}

/**
 * The short version for the welcome screen, once the visitor already has an account.
 *
 * @example quickSetupSteps("windows")[2]?.hint // "Or press Alt + Shift + S."
 */
export function quickSetupSteps(os: OperatingSystem): SetupStep[] {
  return [
    { title: "Install and pin", hint: "Keep it one click away." },
    { title: "Open a product", hint: `${supportedStoresText("or")}.` },
    { title: "Click Picky", hint: `Or press ${shortcutText(QUICK_LOOK_SHORTCUT, os)}.` },
  ];
}

/**
 * The extension's keyboard and mouse gestures, named for `os`.
 *
 * @example extensionGestures("mac")[2]?.keys // "Option-click a product link"
 */
export function extensionGestures(os: OperatingSystem): ExtensionGesture[] {
  return [
    { keys: shortcutText(QUICK_LOOK_SHORTCUT, os), action: "See every detail of the product you are on" },
    { keys: shortcutText(COMPARE_SHORTCUT, os), action: "Compare this product with a saved comparison" },
    { keys: `${altClickText(os)} a product link`, action: "Saves that product without opening it" },
    { keys: "Right-click → Save to Picky", action: "Saves this product, or a linked one, to Picky or a comparison" },
  ];
}
