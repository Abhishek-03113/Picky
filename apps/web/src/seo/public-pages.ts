import { supportedStoresText } from "@picky/catalog/sites";
import { EXTENSION_PATH, PRIVACY_PATH } from "../auth/route-guards.ts";
import { pageTitle } from "../format/page-title.ts";

/** A page anyone can open, so search engines index it and the build prerenders it to HTML. */
export interface PublicPage {
  path: string;
  /** The browser-tab and search-result title, before " · Picky" (pageTitle). */
  name: string;
  /** The search-result snippet: under 160 characters, so search engines show it whole. */
  description: string;
}

const STORES = supportedStoresText();

/** The public pages, homepage first. Sign-in and every signed-in page stay out of search results. */
export const PUBLIC_PAGES: readonly PublicPage[] = [
  {
    path: "/",
    name: `Compare ${STORES} products side by side`,
    description: `Picky saves products as you browse ${STORES}, shows every detail on one clean page, and points out where your shortlist really differs. Free.`,
  },
  {
    path: EXTENSION_PATH,
    name: `Chrome extension for ${STORES}`,
    description: `Save ${STORES} products to Picky in one click and see every detail on one clean page. Free for Chrome, Edge and Brave.`,
  },
  {
    path: PRIVACY_PATH,
    name: "Privacy",
    description:
      "What Picky saves and why, that it never sells it, and how to get a copy or delete your account and everything in it.",
  },
];

/** The public page at `path`. Throws for any other path: only public pages carry search metadata. */
export function publicPage(path: string): PublicPage {
  const page = PUBLIC_PAGES.find((candidate) => candidate.path === path);
  if (page === undefined) throw new Error(`No public page at "${path}"; expected one of PUBLIC_PAGES`);
  return page;
}

/** Where the head tags point: the site's public origin (null on local builds) and the Chrome Web Store listing. */
export interface HeadContext {
  origin: string | null;
  extensionUrl: string;
}

const SHARED_TAGS = [
  '<meta property="og:type" content="website" />',
  '<meta property="og:site_name" content="Picky" />',
  '<meta name="twitter:card" content="summary" />',
];

/**
 * The <head> tags that describe `page` to search engines and link previews: title, description, canonical
 * URL, Open Graph and, on the homepage, JSON-LD naming Picky as a free browser app. Absolute URLs need the
 * origin, so a local build (origin null) leaves those tags out rather than pointing somewhere wrong.
 *
 * @example pageHeadTags(publicPage("/"), { origin: "https://picky.example", extensionUrl }) // "<title>Compare … · Picky</title>…"
 */
export function pageHeadTags(page: PublicPage, context: HeadContext): string {
  const title = pageTitle(page.name);
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    ...SHARED_TAGS,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
  ];
  const { origin } = context;
  if (origin !== null) {
    const url = origin + page.path;
    tags.push(
      `<link rel="canonical" href="${escapeHtml(url)}" />`,
      `<meta property="og:url" content="${escapeHtml(url)}" />`,
      `<meta property="og:image" content="${escapeHtml(origin)}/mascot.png" />`,
      '<meta property="og:image:width" content="640" />',
      '<meta property="og:image:height" content="640" />',
      '<meta property="og:image:alt" content="Picky, a cream bean wearing teal headphones" />',
    );
    if (page.path === "/") tags.push(structuredData(page, origin, context.extensionUrl));
  }
  return tags.join("\n    ");
}

/** schema.org JSON-LD: the site, and Picky as a free browser extension with its store listing. */
function structuredData(page: PublicPage, origin: string, extensionUrl: string): string {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "Picky", url: `${origin}/`, description: page.description },
      {
        "@type": "SoftwareApplication",
        name: "Picky",
        url: `${origin}/`,
        description: page.description,
        applicationCategory: "BrowserApplication",
        operatingSystem: "Chrome, Edge, Brave",
        downloadUrl: extensionUrl,
        image: `${origin}/mascot.png`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  };
  // "<" is escaped so no value can close the script element early.
  return `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
