/** Placeholder in index.html that the build replaces with og:url and og:image. */
export const SOCIAL_URLS_MARKER = /<!-- picky:social-urls[^>]*-->/;

/**
 * The site's public origin for link previews: PICKY_SITE_URL, else Vercel's production domain, else none
 * (local builds), in which case the absolute-URL tags are left out rather than pointing somewhere wrong.
 *
 * @example siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "picky-web.vercel.app" }) // "https://picky-web.vercel.app"
 */
export function siteOrigin(env: Readonly<Record<string, string | undefined>>): string | null {
  const configured = env.PICKY_SITE_URL?.trim();
  if (configured) return new URL(configured).origin;
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercelHost ? `https://${vercelHost}` : null;
}

/**
 * Swaps the marker for og:url / og:image tags (or nothing, without an origin).
 *
 * @example withSocialUrls(html, "https://picky.example") // html with <meta property="og:image" ...>
 */
export function withSocialUrls(html: string, origin: string | null): string {
  const tags =
    origin === null
      ? ""
      : [
          `<meta property="og:url" content="${origin}/" />`,
          `<meta property="og:image" content="${origin}/mascot.png" />`,
          `<meta property="og:image:alt" content="Picky, a cream bean wearing teal headphones" />`,
        ].join("\n    ");
  return html.replace(SOCIAL_URLS_MARKER, tags);
}
