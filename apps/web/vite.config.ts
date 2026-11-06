import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { robotsTxt, sitemapXml } from "./crawl-files.ts";
import { HEAD_MARKER, SHELL_HEAD } from "./prerender-html.ts";
import { siteOrigin } from "./social-urls.ts";

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
    // The dev server has no prerender step (prerender.ts), so it serves the app shell's head.
    { name: "picky-dev-head", apply: "serve", transformIndexHtml: (html) => html.replace(HEAD_MARKER, SHELL_HEAD) },
    crawlFiles(),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Libraries change far less often than app code. In their own chunk they keep their content hash across
        // deploys, so a returning visitor's browser reuses its cached copy and downloads only the app code.
        codeSplitting: { groups: [{ name: "vendor", test: /node_modules/ }] },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": process.env.PICKY_API_URL ?? "http://localhost:8787" },
  },
});
