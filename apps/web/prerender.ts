/**
 * Build step after `vite build` and `vite build --ssr` (package.json "build"): writes every public page as
 * real HTML, with its own title, description and canonical URL, next to a plain app shell for the rest.
 *
 *   dist/index.html, dist/extension.html, dist/privacy.html  prerendered public pages (vercel.json routes them)
 *   dist/app.html                                            the empty shell every signed-in route loads
 */
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readAppConfig } from "./src/config/app-config.ts";
import { HEAD_MARKER, ROOT_MARKER, prerenderedHtml, publicPageFile, shellHtml } from "./prerender-html.ts";
import { siteOrigin } from "./social-urls.ts";
import { PUBLIC_PAGES } from "./src/seo/public-pages.ts";

const DIST = join(import.meta.dir, "dist");
const SSR_DIST = join(import.meta.dir, "dist-ssr");

const { renderPublicPage } = (await import(join(SSR_DIST, "render-public-page.js"))) as {
  renderPublicPage: typeof import("./src/prerender/render-public-page.tsx").renderPublicPage;
};
const built = await readFile(join(DIST, "index.html"), "utf8");
if (!built.includes(HEAD_MARKER) || !built.includes(ROOT_MARKER)) {
  throw new Error(`dist/index.html lacks ${HEAD_MARKER} or ${ROOT_MARKER}; expected the markers from index.html`);
}
const config = readAppConfig(process.env);
const context = { origin: siteOrigin(process.env), extensionUrl: config.extensionUrl };

await writeFile(join(DIST, "app.html"), shellHtml(built));
for (const page of PUBLIC_PAGES) {
  const body = await renderPublicPage(page.path, config);
  await writeFile(join(DIST, publicPageFile(page.path)), prerenderedHtml(built, page, body, context));
}
await rm(SSR_DIST, { recursive: true, force: true });
console.log(`prerendered ${PUBLIC_PAGES.map((page) => page.path).join(", ")} and the app shell`);
