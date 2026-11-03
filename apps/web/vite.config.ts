import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { robotsTxt, sitemapXml } from "./crawl-files.ts";
import { siteOrigin, withSocialUrls } from "./social-urls.ts";

const origin = siteOrigin(process.env);

/** Emits robots.txt always and sitemap.xml when the public origin is known (a sitemap needs absolute URLs). */
function crawlFiles(): Plugin {
  return {
    name: "picky-crawl-files",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt(origin) });
      if (origin !== null) this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml(origin) });
    },
  };
}

// The dev server proxies /api to the Hono API, so the browser sees one origin and needs no CORS.
export default defineConfig({
  plugins: [
    react(),
    { name: "picky-social-urls", transformIndexHtml: (html) => withSocialUrls(html, origin) },
    crawlFiles(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": process.env.PICKY_API_URL ?? "http://localhost:8787" },
  },
});
