# Changelog

All notable changes to Picky. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/). One version number covers the web app, API and extension.

## [2.0.0] - Unreleased

Picky goes from "understand and compare" to "decide and buy": carts you can share, a checkout handoff to each store,
price history, and five more stores.

### Added

- **Carts.** Named carts in your account ("My cart" to start), with quantities, items grouped by store, and totals kept
  per currency (never converted). "Add to cart" on product cards, details pages, comparison columns and the library's
  selection bar. Pick items in a cart and compare them side by side.
- **Share links.** One short link per cart that opens without an account and shows only the cart's name and items. Turn it
  off at any time. Anyone with the link can save their own copy.
- **Import and export.** Import a cart from a share link or code, or from a Picky file. Export a cart as a spreadsheet
  (CSV) or a Picky file, and back up or restore everything: saved products, comparisons and carts.
- **Checkout handoff.** One checklist per cart: a single link that fills your Amazon cart, and the product pages for other
  stores. Mark each store done as you go. Picky never sees payment details and adds nothing to store links.
- **Price history.** Every price Picky sees when you save a product is kept. The details page and cart show a trend line
  and one plain line about it, such as "Lowest since you saved it".
- **New stores (Beta):** Walmart, Target, Best Buy, eBay and Etsy. Each asks for access the first time Picky needs it there.
- **Extension:** a Cart view in the Picky panel (`Alt+Shift+K`), "Add to cart" in the panel and the right-click menu, and a
  small "Save to Picky" button on product pages that you can move or hide.
- **Better reading of product pages:** decimal-comma and range prices, more structured-data shapes, the selected size or
  colour, and product identifiers (GTIN, MPN, model) when a page lists them.

### Changed

- Amazon and Flipkart are read and shown exactly as before.
- Database: three new tables for carts, share links and price observations. Nothing existing is altered.

## [1.3.0] - 2026-11-03

### Added

- Amazon.com alongside Amazon.in, from one store registry.
- Homepage before sign-in, an install guide, search-engine metadata and prerendered public pages.

### Changed

- Shopper vocabulary across the app, extension and store listing.
- Extension bundles about five times smaller.

## [1.2.0] - 2026-11-02

### Added

- Size charts and colour options from Amazon.in pages.
- Products added by pasting a link in the web app.

## [1.1.0] - 2026-10-06

### Added

- Picky accounts: your library and comparisons are private to you. Quick Look works without an account.

## [1.0.0] - 2026-10-06

### Added

- First release: save products from Amazon.in and Flipkart, see every detail on one clean page, and compare them.

[2.0.0]: https://github.com/Abhishek-03113/Picky/compare/v1.1.0...release/v2
[1.1.0]: https://github.com/Abhishek-03113/Picky/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Abhishek-03113/Picky/releases/tag/v1.0.0
