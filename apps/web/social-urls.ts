/**
 * The site's public origin, for canonical URLs, link previews and the sitemap: PICKY_SITE_URL, else Vercel's
 * production domain, else none (local builds), in which case absolute-URL tags are left out rather than
 * pointing somewhere wrong.
 *
 * @example siteOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "picky-web.vercel.app" }) // "https://picky-web.vercel.app"
 */
export function siteOrigin(env: Readonly<Record<string, string | undefined>>): string | null {
  const configured = env.PICKY_SITE_URL?.trim();
  if (configured) return new URL(configured).origin;
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercelHost ? `https://${vercelHost}` : null;
}
