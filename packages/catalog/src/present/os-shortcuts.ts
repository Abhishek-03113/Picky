/** The operating systems whose keyboards label keys differently. */
export type OperatingSystem = "mac" | "windows" | "linux" | "chromeos" | "other";

/** The slice of `navigator` used to tell the OS apart; tests pass plain objects. */
export interface NavigatorLike {
  userAgentData?: { platform?: string };
  platform?: string;
  userAgent?: string;
}

/**
 * Which OS the browser runs on, from `navigator`: the modern platform hint first, then the legacy
 * `platform` and user-agent strings. Android and iOS come out as "other": they run no extensions.
 *
 * @example detectOperatingSystem({ platform: "MacIntel" }) // "mac"
 */
export function detectOperatingSystem(nav: NavigatorLike | undefined): OperatingSystem {
  const hints = [nav?.userAgentData?.platform, nav?.platform, nav?.userAgent].join(" ").toLowerCase();
  if (/android|iphone|ipad|ipod/.test(hints)) return "other";
  if (/cros|chrome ?os/.test(hints)) return "chromeos";
  if (/mac/.test(hints)) return "mac";
  if (/win/.test(hints)) return "windows";
  if (/linux|x11/.test(hints)) return "linux";
  return "other";
}

/** Key names as the extension manifest spells them ("Alt", "Shift", ...), plus "Enter" and plain keys. */
export type ShortcutKeys = readonly string[];

// The extension's commands (apps/extension/public/manifest.json, "commands"); a test keeps them in sync.
// On a Mac, Chrome binds the manifest's "Alt" to the Option key, so the keys are the same and only the
// labels differ.
export const QUICK_LOOK_SHORTCUT: ShortcutKeys = ["Alt", "Shift", "S"];
export const COMPARE_SHORTCUT: ShortcutKeys = ["Alt", "Shift", "V"];

const MAC_LABELS: Readonly<Record<string, string>> = { Alt: "⌥", Shift: "⇧", Ctrl: "⌃", Command: "⌘", Enter: "Return" };

/**
 * How each key is printed on this OS's keyboard: Mac modifier symbols on a Mac, names elsewhere.
 *
 * @example shortcutKeyLabels(QUICK_LOOK_SHORTCUT, "mac") // ["⌥", "⇧", "S"]
 * @example shortcutKeyLabels(QUICK_LOOK_SHORTCUT, "windows") // ["Alt", "Shift", "S"]
 */
export function shortcutKeyLabels(keys: ShortcutKeys, os: OperatingSystem): string[] {
  return keys.map((key) => (os === "mac" ? (MAC_LABELS[key] ?? key) : key));
}

/**
 * A shortcut as one piece of text, the way each OS writes it.
 *
 * @example shortcutText(COMPARE_SHORTCUT, "mac") // "⌥⇧V"
 * @example shortcutText(COMPARE_SHORTCUT, "linux") // "Alt + Shift + V"
 */
export function shortcutText(keys: ShortcutKeys, os: OperatingSystem): string {
  const labels = shortcutKeyLabels(keys, os);
  return os === "mac" ? labels.join("") : labels.join(" + ");
}

/**
 * The Alt+click gesture (save a product link without opening it), in this OS's words.
 *
 * @example altClickText("mac") // "Option-click"
 */
export function altClickText(os: OperatingSystem): string {
  return os === "mac" ? "Option-click" : "Alt+click";
}
