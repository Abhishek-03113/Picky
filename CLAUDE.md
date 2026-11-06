# Picky

Turns Amazon and Flipkart product pages into one clean, structured page of details.
Research behind the design: `research/FINDINGS.md`.

- `packages/catalog` — shared `ProductSnapshot` types + page extractors (pure, no I/O). The zod schemas live in
  `@picky/catalog/schema`, for the API only: keep zod out of anything the browser loads.
  Supported stores are one registry, `@picky/catalog/sites` (`src/sites/shopping-sites.ts`); everything that
  names or matches a store reads it. Never hard-code a store list. Adding one: `docs/adding-a-site.md`.
- `packages/ui-tokens` — shared `--ez-*` CSS design tokens (Apple HIG, light + dark) for web and extension popup.
- `apps/api` — Bun + Hono backend, Postgres storage, stores snapshots the extension parses (Firecrawl import is unused tech debt).
- `apps/web` — React + TanStack Router/Query frontend: signed-out homepage at `/`, `/extension` install guide, `/privacy`, and the library + spec sheets once signed in.
- `apps/landing` — redirect-only page that forwards the old landing URL to the web app's homepage.
- `apps/extension` — MV3 browser extension that captures the open product page.

Shopper vocabulary (UI, store listing and promo copy; code names stay as they are):
"details" not specs, "sections" not spec groups, "every detail, on one clean page" not spec sheet,
"Save to Picky" / "Saved" not add, capture or library, "See details" / the Picky panel not Quick Look,
"Price as of" not captured, "not listed" / "not shown" not unknown. Errors shown to shoppers say what
happened and what to do; the developer reason goes to logs (`failureHint`, `shopper-error.ts`).

Commands (repo root): `bun run test`, `bun run typecheck`, `bun run format`,
`bun run db:up`, `bun run dev:api`, `bun run dev:web`, `bun run build:extension`,
`PICKY_WEB_URL=https://… bun run package:extension` (Chrome Web Store zip, see `docs/chrome-web-store.md`).

## Code rules — always loaded

Invoke the `clean-code` skill at the start of every coding session. Its rules are imported here so they are always in context:

@.claude/skills/clean-code/SKILL.md
