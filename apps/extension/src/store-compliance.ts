/**
 * Chrome Web Store checks run on the built extension before it is zipped for upload (release.ts).
 * Each rule mirrors a store requirement or a common rejection reason; docs/chrome-web-store.md has the
 * listing answers that go with them.
 */

/** The manifest fields these checks read; the real manifest has more. */
export interface StoreManifest {
  manifest_version?: unknown;
  name?: unknown;
  short_name?: unknown;
  description?: unknown;
  version?: unknown;
  homepage_url?: unknown;
  icons?: Record<string, string>;
  action?: { default_icon?: Record<string, string> };
  background?: { service_worker?: string };
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: { matches: string[]; js: string[] }[];
}

/** A built file: its path inside the package and, for text files, its contents. */
export interface PackageFile {
  path: string;
  text?: string;
}

/**
 * Every permission the extension may ask for, with the justification given in the store's
 * "Privacy practices" tab. A permission missing here fails the check, so a new one cannot ship unexplained.
 */
export const PERMISSION_JUSTIFICATIONS: Readonly<Record<string, string>> = {
  activeTab:
    "Reads the product page in the current tab only when the user clicks the toolbar button, presses the shortcut or uses the context menu.",
  scripting:
    "Injects the Quick Look panel and the page reader into that tab, after one of those user actions, to turn the page into a spec sheet.",
  storage: "Keeps a few preferences on the device, such as the comparison the user picked last.",
  contextMenus: 'Adds "Add to Picky" and "Quick Look" to the right-click menu on Amazon.in, Amazon.com and Flipkart.',
  offscreen:
    "Parses a product page downloaded from a link (Alt+click or right-click) in an offscreen document, because the service worker has no DOM.",
};

const REQUIRED_ICON_SIZES = ["16", "32", "48", "128"] as const;
const NAME_MAX = 75;
const SHORT_NAME_MAX = 12;
const DESCRIPTION_MAX = 132;
const BROAD_HOSTS = new Set(["<all_urls>", "*://*/*", "http://*/*", "https://*/*"]);
const DYNAMIC_CODE = /\beval\(|new Function\(/;
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>/i;
const REMOTE_SCRIPT = /<script[^>]*\bsrc=["']?(?:https?:)?\/\//i;

/**
 * Problems that would get the package rejected or flagged; empty means it is ready to upload.
 * `release` adds the checks that only matter for the store build (https-only, no localhost).
 *
 * @example storeComplianceProblems(manifest, files, { release: true }) // []
 */
export function storeComplianceProblems(
  manifest: StoreManifest,
  files: readonly PackageFile[],
  options: { release: boolean },
): string[] {
  const paths = new Set(files.map((file) => file.path));
  return [
    ...listingProblems(manifest),
    ...iconProblems(manifest, paths),
    ...referencedFileProblems(manifest, paths),
    ...permissionProblems(manifest),
    ...codeProblems(files),
    ...(options.release ? releaseProblems(manifest) : []),
  ];
}

function listingProblems(manifest: StoreManifest): string[] {
  const problems: string[] = [];
  if (manifest.manifest_version !== 3) problems.push("manifest_version must be 3");
  if (!isText(manifest.name, NAME_MAX)) problems.push(`name must be 1-${NAME_MAX} characters`);
  if (manifest.short_name !== undefined && !isText(manifest.short_name, SHORT_NAME_MAX)) {
    problems.push(`short_name must be 1-${SHORT_NAME_MAX} characters`);
  }
  if (!isText(manifest.description, DESCRIPTION_MAX)) {
    problems.push(`description must be 1-${DESCRIPTION_MAX} characters`);
  }
  if (typeof manifest.version !== "string" || !isChromeVersion(manifest.version)) {
    problems.push(`version "${String(manifest.version)}" must be 1-4 dot-separated integers, each 0-65535`);
  }
  return problems;
}

function iconProblems(manifest: StoreManifest, paths: ReadonlySet<string>): string[] {
  const icons = manifest.icons ?? {};
  const missingSizes = REQUIRED_ICON_SIZES.filter((size) => icons[size] === undefined);
  const declared = [...Object.values(icons), ...Object.values(manifest.action?.default_icon ?? {})];
  return [
    ...missingSizes.map((size) => `icons is missing the ${size}x${size} icon`),
    ...declared.filter((icon) => !paths.has(icon)).map((icon) => `icon file ${icon} is not in the package`),
  ];
}

function referencedFileProblems(manifest: StoreManifest, paths: ReadonlySet<string>): string[] {
  const referenced = [
    ...(manifest.background?.service_worker ? [manifest.background.service_worker] : []),
    ...(manifest.content_scripts ?? []).flatMap((script) => script.js),
  ];
  return referenced.filter((path) => !paths.has(path)).map((path) => `${path} is referenced but not in the package`);
}

function permissionProblems(manifest: StoreManifest): string[] {
  const unexplained = (manifest.permissions ?? []).filter((permission) => !(permission in PERMISSION_JUSTIFICATIONS));
  const hosts = [...(manifest.host_permissions ?? []), ...contentScriptMatches(manifest)];
  return [
    ...unexplained.map((permission) => `permission "${permission}" has no store justification`),
    ...hosts.filter((host) => BROAD_HOSTS.has(host)).map((host) => `host pattern "${host}" is broader than needed`),
  ];
}

function codeProblems(files: readonly PackageFile[]): string[] {
  return files.flatMap((file) => {
    const problems: string[] = [];
    if (file.path.endsWith(".map")) problems.push(`${file.path}: source maps do not belong in the package`);
    if (file.path.split("/").some((part) => part.startsWith("."))) problems.push(`${file.path}: hidden file`);
    if (file.text === undefined) return problems;
    if (file.path.endsWith(".js") && DYNAMIC_CODE.test(file.text)) {
      problems.push(`${file.path}: eval or new Function (MV3 forbids executing generated code)`);
    }
    if (file.path.endsWith(".html") && INLINE_SCRIPT.test(file.text)) {
      problems.push(`${file.path}: inline <script> (blocked by the MV3 content security policy)`);
    }
    if (file.path.endsWith(".html") && REMOTE_SCRIPT.test(file.text)) {
      problems.push(`${file.path}: remotely hosted script (MV3 forbids remote code)`);
    }
    return problems;
  });
}

function releaseProblems(manifest: StoreManifest): string[] {
  const homepage = typeof manifest.homepage_url === "string" ? [manifest.homepage_url] : [];
  const origins = new Set([...(manifest.host_permissions ?? []), ...contentScriptMatches(manifest), ...homepage]);
  const notPublic = [...origins]
    .filter((origin) => !isPublicHttps(origin))
    .map((origin) => `${origin} is not a public https origin; build with PICKY_WEB_URL=https://<your web domain>`);
  return homepage.length === 0 ? ["homepage_url is missing", ...notPublic] : notPublic;
}

function contentScriptMatches(manifest: StoreManifest): string[] {
  return (manifest.content_scripts ?? []).flatMap((script) => script.matches);
}

function isText(value: unknown, maxLength: number): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isChromeVersion(version: string): boolean {
  const parts = version.split(".");
  return parts.length <= 4 && parts.every((part) => /^(0|[1-9]\d{0,4})$/.test(part) && Number(part) <= 65535);
}

function isPublicHttps(pattern: string): boolean {
  const url = URL.parse(pattern.replace("/*", "/"));
  if (url === null || url.protocol !== "https:") return false;
  return !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.hostname.endsWith(".local");
}
