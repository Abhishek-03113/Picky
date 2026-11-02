/** One step of getting the extension working, shown on /extension and on the empty-library welcome. */
export interface SetupStep {
  readonly title: string;
  readonly hint: string;
}

/** Keyboard shortcuts from apps/extension/public/manifest.json ("commands"); keep the two in sync. */
export const QUICK_LOOK_SHORTCUT = "Alt + Shift + S";
export const COMPARE_SHORTCUT = "Alt + Shift + V";

/** The full walk-through, from the store page to a saved product. */
export const SETUP_STEPS: readonly SetupStep[] = [
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
    hint: `On Amazon.in or Flipkart, click Picky or press ${QUICK_LOOK_SHORTCUT} for its specs. Right-click → Add to Picky saves it.`,
  },
];

/** The short version for the welcome screen, once the visitor already has an account. */
export const QUICK_SETUP_STEPS: readonly SetupStep[] = [
  { title: "Install and pin", hint: "Keep it one click away." },
  { title: "Open a product", hint: "Amazon.in or Flipkart." },
  { title: "Click Picky", hint: `Or press ${QUICK_LOOK_SHORTCUT}.` },
];

/** What the extension does on a store page, for the shortcut list on /extension. */
export const EXTENSION_GESTURES: readonly { readonly keys: string; readonly action: string }[] = [
  { keys: QUICK_LOOK_SHORTCUT, action: "Quick Look: the specs of the page you are on" },
  { keys: COMPARE_SHORTCUT, action: "Compare this page with a saved comparison" },
  { keys: "Alt + click a product link", action: "Save that product without opening it" },
  { keys: "Right-click → Add to Picky", action: "Save this page, or a link, to your library or a comparison" },
];
