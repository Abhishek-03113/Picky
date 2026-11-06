/** Deployment-time settings, read once at the composition root and injected through router context. */
export interface AppConfig {
  /** Where "Add to Chrome" points: the Chrome Web Store listing. */
  extensionUrl: string;
}

/** The published Chrome Web Store listing, used unless an env var overrides it. */
export const DEFAULT_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/picky-product-spec-sheets/dbeedkjlgkkdlhfcmdaanhbicdelfenc";

/**
 * Builds the app config from Vite's env; a blank or missing value falls back to the default.
 *
 * @example readAppConfig(import.meta.env) // { extensionUrl: "https://chromewebstore.google.com/..." }
 */
export function readAppConfig(env: Readonly<Record<string, unknown>>): AppConfig {
  const raw = env["VITE_PICKY_EXTENSION_URL"];
  const configured = typeof raw === "string" ? raw.trim() : "";
  return { extensionUrl: configured === "" ? DEFAULT_EXTENSION_URL : configured };
}
