import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { storeComplianceProblems, type PackageFile, type StoreManifest } from "../src/store-compliance.ts";

const ICONS = { "16": "logo-16.png", "32": "logo-32.png", "48": "logo-48.png", "128": "logo-128.png" };

function storeReady(overrides: Partial<StoreManifest> = {}): StoreManifest {
  return {
    manifest_version: 3,
    name: "Picky",
    description: "Clean spec sheets.",
    version: "1.2.0",
    homepage_url: "https://picky.example/",
    icons: ICONS,
    background: { service_worker: "background.js" },
    permissions: ["activeTab", "storage"],
    host_permissions: ["https://www.amazon.in/*", "https://picky.example/*"],
    content_scripts: [{ matches: ["https://picky.example/*"], js: ["web-bridge.js"] }],
    ...overrides,
  };
}

const PACKAGE: PackageFile[] = [
  ...Object.values(ICONS).map((path) => ({ path })),
  { path: "background.js", text: "chrome.runtime.onInstalled.addListener(() => {});" },
  { path: "web-bridge.js", text: "" },
  { path: "popup.html", text: '<script src="popup.js"></script>' },
];

const release = { release: true };

describe("storeComplianceProblems", () => {
  test("a complete https package has no problems", () => {
    expect(storeComplianceProblems(storeReady(), PACKAGE, release)).toEqual([]);
  });

  test("listing fields: name, description and version limits", () => {
    const manifest = storeReady({ name: "x".repeat(76), description: "y".repeat(133), version: "1.2.65536" });
    expect(storeComplianceProblems(manifest, PACKAGE, release)).toEqual([
      "name must be 1-75 characters",
      "description must be 1-132 characters",
      'version "1.2.65536" must be 1-4 dot-separated integers, each 0-65535',
    ]);
  });

  test("every icon size is declared and shipped, and referenced scripts exist", () => {
    const files = PACKAGE.filter((file) => file.path !== "logo-32.png" && file.path !== "web-bridge.js");
    const { "48": _dropped, ...withoutFortyEight } = ICONS;
    expect(storeComplianceProblems(storeReady({ icons: withoutFortyEight }), files, release)).toEqual([
      "icons is missing the 48x48 icon",
      "icon file logo-32.png is not in the package",
      "web-bridge.js is referenced but not in the package",
    ]);
  });

  test("permissions need a justification, and all-sites access is refused", () => {
    const manifest = storeReady({ permissions: ["tabs"], host_permissions: ["<all_urls>"] });
    expect(storeComplianceProblems(manifest, PACKAGE, { release: false })).toEqual([
      'permission "tabs" has no store justification',
      'host pattern "<all_urls>" is broader than needed',
    ]);
  });

  test("no generated or remote code, inline scripts, source maps or hidden files", () => {
    const files: PackageFile[] = [
      ...PACKAGE,
      { path: "evil.js", text: "const f = new Function('return 1');" },
      { path: "inline.html", text: "<script>alert(1)</script>" },
      { path: "remote.html", text: '<script src="https://cdn.example/x.js"></script>' },
      { path: "background.js.map" },
      { path: ".DS_Store" },
    ];
    expect(storeComplianceProblems(storeReady(), files, release)).toEqual([
      "evil.js: eval or new Function (MV3 forbids executing generated code)",
      "inline.html: inline <script> (blocked by the MV3 content security policy)",
      "remote.html: remotely hosted script (MV3 forbids remote code)",
      "background.js.map: source maps do not belong in the package",
      ".DS_Store: hidden file",
    ]);
  });

  test("the store build must not point at localhost or plain http; a dev build may", () => {
    const local = storeReady({
      homepage_url: "http://localhost:5173/",
      host_permissions: ["https://www.amazon.in/*", "http://localhost:5173/*"],
      content_scripts: [{ matches: ["http://localhost:5173/*"], js: ["web-bridge.js"] }],
    });
    expect(storeComplianceProblems(local, PACKAGE, release)).toEqual([
      "http://localhost:5173/* is not a public https origin; build with PICKY_WEB_URL=https://<your web domain>",
      "http://localhost:5173/ is not a public https origin; build with PICKY_WEB_URL=https://<your web domain>",
    ]);
    expect(storeComplianceProblems(local, PACKAGE, { release: false })).toEqual([]);
    expect(storeComplianceProblems(storeReady({ homepage_url: undefined }), PACKAGE, release)).toEqual([
      "homepage_url is missing",
    ]);
  });

  test("the checked-in manifest passes the listing and permission checks", async () => {
    const manifest = (await Bun.file(join(import.meta.dir, "../public/manifest.json")).json()) as StoreManifest;
    const shipped: PackageFile[] = [
      ...Object.values(manifest.icons ?? {}).map((path) => ({ path })),
      { path: manifest.background?.service_worker ?? "" },
      ...(manifest.content_scripts ?? []).flatMap((script) => script.js.map((path) => ({ path }))),
    ];
    expect(storeComplianceProblems(manifest, shipped, { release: false })).toEqual([]);
  });
});
