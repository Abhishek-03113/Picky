import { pageHeadTags, type HeadContext, type PublicPage } from "./src/seo/public-pages.ts";

/** Where index.html wants the page's head tags; filled per page at build time (prerender.ts). */
export const HEAD_MARKER = "<!-- picky:head -->";
/** The empty mount point the prerendered page goes into. */
export const ROOT_MARKER = '<div id="root"></div>';

/**
 * The head of the app shell, which every signed-in route, sign-in and unknown URL loads. Each page sets its own
 * title once the app runs; `noindex` keeps search engines from listing the shell (or soft 404s) as a page.
 */
export const SHELL_HEAD = ["<title>Picky</title>", '<meta name="robots" content="noindex" />'].join("\n    ");

/**
 * The app shell: the built index.html with a neutral head and an empty root.
 *
 * @example shellHtml(builtIndexHtml) // "…<title>Picky</title>…<div id=\"root\"></div>…"
 */
export function shellHtml(built: string): string {
  return built.replace(HEAD_MARKER, SHELL_HEAD);
}

/**
 * A public page as served: its own head tags, and its prerendered markup inside the root. The wrapper is what
 * index.html's inline script hides for a returning signed-in visitor; React replaces it on its first render.
 *
 * @example prerenderedHtml(builtIndexHtml, publicPage("/"), "<div class=\"app\">…</div>", { origin, extensionUrl })
 */
export function prerenderedHtml(built: string, page: PublicPage, body: string, context: HeadContext): string {
  return built
    .replace(HEAD_MARKER, pageHeadTags(page, context))
    .replace(ROOT_MARKER, `<div id="root"><div data-prerendered>${body}</div></div>`);
}

/**
 * The file vercel.json serves for a public path.
 *
 * @example publicPageFile("/") // "index.html"; publicPageFile("/extension") // "extension.html"
 */
export function publicPageFile(path: string): string {
  return path === "/" ? "index.html" : `${path.slice(1)}.html`;
}
