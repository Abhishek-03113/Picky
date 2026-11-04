# Adding a shopping site

Every store Picky reads is one entry in the site registry. The extension manifest, link checks,
right-click menu, store filter, homepage, UI copy and privacy policy all read the store list from it,
so a new store is mostly data plus a page reader.

## 1. Register the store

Add an entry to `SITE_LIST` in [`packages/catalog/src/sites/shopping-sites.ts`](../packages/catalog/src/sites/shopping-sites.ts)
(the fields are documented on `ShoppingSite` in `shopping-site.ts`):

| Field              | Example                                     | Used for                                                 |
| ------------------ | ------------------------------------------- | -------------------------------------------------------- |
| `source`           | `"croma.com"`                               | Stored with every snapshot. Never rename it later.       |
| `label`, `brand`   | `"Croma"`, `"Croma"`                        | UI names; `brand` for "not affiliated with …" notices.   |
| `host`             | `"www.croma.com"`                           | Host permission and URL matching (bare domain accepted). |
| `productPaths`     | `["/*/p/*"]`                                | Right-click menu and the Alt+click link check.           |
| `productPagesHint` | `"/p/… pages"`                              | The extension's "supported sites" list.                  |
| `exampleUrl`       | a real product URL                          | Error messages; the registry tests read it.              |
| `currency`         | `"INR"`                                     | Prices shown without a currency symbol.                  |
| `searchUrl`        | `"https://www.croma.com/search?q={query}"`  | Optional: adds a "Search Croma" row to comparisons.      |

Order matters only for display (store filter, lists).

## 2. Give it a page reader

TypeScript now fails in [`packages/catalog/src/extract/site-extractors.ts`](../packages/catalog/src/extract/site-extractors.ts)
until the new source has a reader. Pick the cheapest one that works:

- **Another storefront of a store Picky already reads** (amazon.co.uk, say): reuse its factory,
  `createAmazonExtractor(shoppingSite("amazon.co.uk"))`. Nothing else to write.
- **The page has schema.org `Product` JSON-LD** (most stores do; check for a
  `<script type="application/ld+json">` with `"@type": "Product"`): use
  `createJsonLdExtractor(site, rules)` from `extract/shared/json-ld-extractor.ts`. `rules` needs only
  `parseProductUrl`; add `readSpecGroups` / `readHighlights` when the spec table is in the page rather
  than the JSON-LD. `extract/flipkart/` is the worked example.
- **No JSON-LD**: write a reader over the page's own markup, as `extract/amazon/` does. Put it in
  `extract/<store>/`, keep it pure (it runs in the browser and on the server), and reuse
  `extract/shared/` for spec tables, breadcrumbs and money.

## 3. Test it

1. `bun run test`: the registry tests (`packages/catalog/test/shopping-sites.test.ts`) check that the
   reader owns `exampleUrl`, that the link check accepts it and that hosts don't clash.
2. Capture a real page as a golden fixture:
   ```sh
   bun run fixtures:capture "<product url>" <slug>
   ```
   The fixture test expects one per source. Until you have one, list the source in
   `SOURCES_WITHOUT_FIXTURES` in `packages/catalog/test/page-fixtures.test.ts`.
3. Load the unpacked extension (`bun run build:extension`), open a product page and check Quick Look,
   right-click → Add to Picky and Alt+click on a product link.

## 4. Release

- Hand-written store copy the build cannot fill: the Chrome Web Store listing in
  [`chrome-web-store.md`](chrome-web-store.md) and `apps/extension/store/promo.html` (re-render the
  promo PNGs). A test fails until both name the new store.
- Bump `version` in `apps/extension/public/manifest.json`. A new host permission makes Chrome disable
  the extension for existing users until they accept it, so say why in the release notes.
- Update `LAST_UPDATED` on the privacy page: its store list changed.
