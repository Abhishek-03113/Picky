import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { storeComplianceProblems, type PackageFile, type StoreManifest } from "./src/store-compliance.ts";

// Builds the Chrome Web Store package: a production build, the store checks, then a zip to upload.
// Usage (repo root): PICKY_WEB_URL=https://<web domain> bun run package:extension
const DIST_DIR = join(import.meta.dir, "dist");
const RELEASE_DIR = join(import.meta.dir, "release");
const TEXT_EXTENSIONS = [".js", ".html", ".json", ".css"];

if (!Bun.env.PICKY_WEB_URL) {
  console.error(
    "Set PICKY_WEB_URL to the deployed web app (https://...): the store build must not point at localhost.",
  );
  process.exit(1);
}

const build = Bun.spawnSync(["bun", "build.ts"], { cwd: import.meta.dir, stdout: "inherit", stderr: "inherit" });
if (build.exitCode !== 0) process.exit(build.exitCode ?? 1);

const files = await readPackage(DIST_DIR);
const manifest = (await Bun.file(join(DIST_DIR, "manifest.json")).json()) as StoreManifest;
const problems = storeComplianceProblems(manifest, files, { release: true });
if (problems.length > 0) {
  console.error(`Not ready for the Chrome Web Store:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
  process.exit(1);
}

await mkdir(RELEASE_DIR, { recursive: true });
const zipPath = join(RELEASE_DIR, `picky-extension-${String(manifest.version)}.zip`);
await rm(zipPath, { force: true });
// -X leaves out macOS/Unix extra attributes; the manifest sits at the zip's root, as the store requires.
const zip = Bun.spawnSync(["zip", "-r", "-X", "-q", zipPath, "."], { cwd: DIST_DIR, stderr: "inherit" });
if (zip.exitCode !== 0) {
  console.error("Zipping failed. Is the `zip` command installed? (macOS and most Linux distributions ship it.)");
  process.exit(zip.exitCode ?? 1);
}
console.log(
  `Store package ready: ${zipPath} (${files.length} files). Upload it at https://chrome.google.com/webstore/devconsole`,
);

async function readPackage(dir: string): Promise<PackageFile[]> {
  const paths = (await readdir(dir, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1));
  return Promise.all(
    paths.map(async (path) =>
      TEXT_EXTENSIONS.some((extension) => path.endsWith(extension))
        ? { path, text: await Bun.file(join(dir, path)).text() }
        : { path },
    ),
  );
}
