# Publishing the extension on the Chrome Web Store

Everything the store asks for, in the order the developer dashboard asks for it. The package checks
in `apps/extension/src/store-compliance.ts` cover the technical requirements; this page holds the
listing answers, which have to match the [privacy policy](../apps/web/src/pages/privacy-page.tsx)
(served at `/privacy` on the web app).

## 1. Build the package

```sh
PICKY_WEB_URL=https://<web domain> bun run package:extension
```

This runs the production build, checks it and writes `apps/extension/release/picky-extension-<version>.zip`.
The build refuses to package when:

- any host permission, content-script match or `homepage_url` is not a public `https` origin (a
  `localhost` build cannot be uploaded by mistake);
- a permission has no justification in `PERMISSION_JUSTIFICATIONS` (so a new permission cannot ship
  without a matching answer below);
- the name is over 75 characters, the description over 132, or the version is not 1-4 integers;
- an icon size (16, 32, 48, 128) is missing, or a file the manifest names is not in the package;
- any script uses `eval`/`new Function`, an HTML page has an inline or remote `<script>`, or the zip
  would contain source maps or hidden files.

Bump `version` in `apps/extension/public/manifest.json` before every upload: the store rejects a
version it has already seen.

## 2. Store listing tab

| Field              | Value                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Name               | From the manifest: `Picky: Compare Products & See Every Detail`                             |
| Summary            | From the manifest `description`                                                             |
| Category           | Shopping                                                                                    |
| Language           | English (India), or English                                                                 |
| Store icon         | `assets/logo-128.png` (128×128)                                                             |
| Small promo tile   | `apps/extension/store/promo-small-440x280.png` (required)                                   |
| Marquee promo tile | `apps/extension/store/promo-marquee-1400x560.png` (optional)                                |
| Screenshots        | 1-5 at 1280×800 or 640×400, see below                                                       |
| Official URL       | The web domain, once verified in Google Search Console                                      |
| Homepage URL       | `https://<web domain>/`                                                                     |
| Support URL        | `https://github.com/Abhishek-03113/Picky/issues`                                            |

Regenerate the promo tiles after a brand change with `bun run --cwd apps/extension store:images`
(source: `apps/extension/store/promo.html`).

**Screenshots** have to show the extension itself, so take them by hand on real pages at a
1280×800 window: the Picky panel's Details view on an Amazon product, the Compare view with two
products, the right-click "Save to Picky" menu, and the web app's product or comparison page.

**Description** (paste as is):

> Picky shows every detail of an Amazon or Flipkart product on one clean page, without the offers and
> ads, and helps you compare the products on your shortlist.
>
> • See every detail: click the Picky button (or press Alt+Shift+S) on any product page. Full specs, in
> clear sections you can search. No account needed.
> • Save as you browse: right-click → Save to Picky, or hold Alt and click a product link, to save it
> without leaving the page.
> • Compare: put your shortlist side by side (Alt+Shift+V). Details that match fold away, clear wins
> are marked, and matters of taste are left to you.
> • Saved on any device: your products and comparisons live in your free Picky account.
>
> Picky works only on Amazon (amazon.in and amazon.com), Flipkart and the Picky website. It looks at a
> page only when you ask, shows no ads and sells nothing. Picky is not affiliated with Amazon or Flipkart.

## 3. Privacy practices tab

**Single purpose:**

> Picky shows every detail of a product page on Amazon (amazon.in and amazon.com) and Flipkart on one
> clean page, which the user can save to their Picky account and compare.

**Permission justifications** (the same text as `PERMISSION_JUSTIFICATIONS`):

| Permission         | Justification                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`        | Reads the product page in the current tab only when the user clicks the toolbar button, presses the shortcut or uses the context menu.             |
| `scripting`        | Injects the Picky panel and the page reader into that tab, after one of those user actions, to show the product's details.                         |
| `storage`          | Keeps a few preferences on the device, such as the comparison the user picked last.                                                                 |
| `contextMenus`     | Adds "Save to Picky" and "See details" to the right-click menu on Amazon (amazon.in and amazon.com) and Flipkart.                                         |
| `offscreen`        | Parses a product page downloaded from a link (Alt+click or right-click) in an offscreen document, because the service worker has no DOM.           |
| Host permissions   | amazon.in, amazon.com and flipkart.com: download a product link the user Alt+clicked or right-clicked, in their browser. The Picky web domain: save products to the user's account and read their comparisons. |
| Content scripts    | On amazon.in, amazon.com and flipkart.com, a small listener that only reacts to Alt+click on a product link. On the Picky web domain, a bridge so the web app's "paste a link" field can ask the extension to read that link. |

**Remote code:** No, I am not using remote code. (All scripts ship in the package; the extension only
exchanges JSON with the Picky API.)

**Data usage**, tick exactly these:

- *Personally identifiable information*: yes, the account email (held by the Picky website; the
  extension sends the sign-in cookie with its requests).
- *Authentication information*: yes, the Picky session cookie, used only to save to the user's own
  account.
- *Website content*: yes, the product details of pages the user chooses to save or open in the Picky panel.
- Everything else (health, financial, personal communications, location, web history, user
  activity): no.

Then certify all three statements: data is not sold to third parties, not used or transferred for
purposes unrelated to the single purpose, and not used to determine creditworthiness or for lending.

**Privacy policy URL:** `https://<web domain>/privacy`

## 4. Distribution and submit

- Visibility: Public (or Unlisted for a soft launch).
- Regions: all, or India only, since the supported stores are Indian.
- Submit for review. After approval, put the listing URL in `VITE_PICKY_EXTENSION_URL` on the
  `picky-web` project and redeploy, so every "Add to Chrome" button points at it.

## Common rejection reasons this setup avoids

- **Excessive permissions:** no `tabs`, no `<all_urls>`; host access is the three stores plus Picky.
- **Missing or mismatched privacy policy:** `/privacy` lists exactly the data above.
- **Remote code / obfuscation:** bundles are minified (whitespace and syntax only; names are kept, so the
  code stays readable) and contain no `eval`.
- **Keyword spam or misleading branding:** the description names the stores once, plainly (Amazon's two
  sites by domain), and says
  Picky is not affiliated with them.
- **Broken functionality for reviewers:** the Picky panel (See details) works without an account. Mention in the
  reviewer notes that saving needs a free account, created at `https://<web domain>/login?mode=signup`.
