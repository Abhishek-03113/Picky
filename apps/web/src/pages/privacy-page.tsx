import { Link } from "@tanstack/react-router";
import { EXTENSION_PATH } from "../auth/route-guards.ts";
import { AppBar, BrandLink, SiteNav } from "../components/app-bar.tsx";
import { usePageTitle } from "../hooks/use-page-title.ts";

/** Where privacy questions and deletion requests go; also linked from the Chrome Web Store listing. */
export const PRIVACY_CONTACT_URL = "https://github.com/Abhishek-03113/Picky/issues";
const LAST_UPDATED = "2 November 2026";

/**
 * Privacy policy for the web app and the Chrome extension. The Chrome Web Store requires one, and its
 * "Privacy practices" answers must match it (docs/chrome-web-store.md).
 */
export function PrivacyPage() {
  usePageTitle("Privacy");
  return (
    <>
      <AppBar>
        <BrandLink />
        <SiteNav />
      </AppBar>
      <main className="page narrow legal">
        <div className="page-head-text">
          <h1 className="page-title">Privacy policy</h1>
          <p className="subtle">Last updated {LAST_UPDATED}</p>
        </div>
        <article className="card legal-card">
          <p>
            Picky helps you save and compare products from Amazon.in and Flipkart. This policy covers the Picky website
            and the <Link to={EXTENSION_PATH}>Picky Chrome extension</Link>. The short version: Picky keeps only what
            you choose to save, uses it only to show it back to you, and never sells or shares it.
          </p>

          <h2>What Picky stores</h2>
          <ul>
            <li>
              <strong>Your account:</strong> your email address and your password, kept securely. Picky never stores
              your password in readable form.
            </li>
            <li>
              <strong>A sign-in cookie:</strong> a random session token that keeps you signed in for up to 30 days. It
              is HttpOnly, so page scripts cannot read it, and signing out ends it.
            </li>
            <li>
              <strong>Products you save:</strong> the product page's address, title, brand, category, price,
              availability, rating, image links, highlights and specifications, and when you saved it.
            </li>
            <li>
              <strong>Comparisons you make:</strong> their names and which saved products they hold.
            </li>
          </ul>

          <h2>What the extension reads, and when</h2>
          <ul>
            <li>
              It works only on Amazon.in and Flipkart pages and on the Picky website. It does not run on, read or record
              any other site, and it does not collect your browsing history.
            </li>
            <li>
              It reads a product page only when you ask: clicking the toolbar button, a keyboard shortcut, Alt+click on
              a product link, or the right-click menu. Quick Look shows the specs inside the page without sending them
              anywhere.
            </li>
            <li>
              When you save a product, the extension sends the product details listed above to your Picky account. To
              read a product from a link, it downloads that page in your browser, like opening it in a tab would.
            </li>
            <li>
              It stores a few preferences in your browser (such as the comparison you used last). It has no password of
              its own: it uses your sign-in on the Picky website.
            </li>
          </ul>

          <h2>What Picky does not do</h2>
          <ul>
            <li>No advertising, no analytics or tracking scripts, and no selling or renting of your data.</li>
            <li>No sharing with anyone, except the hosting providers that run Picky for us (listed below).</li>
            <li>
              Your data is not used to decide creditworthiness or for lending, and it is not used for any purpose
              unrelated to showing you your products and comparisons.
            </li>
          </ul>

          <h2>Where it lives</h2>
          <p>
            Picky runs on Vercel (website and API) and Neon (Postgres database). They store and process data only to run
            the service. Connections are encrypted with HTTPS. Server logs note what happened (for example, that a
            product was saved, by its id) so errors can be fixed; they never contain your password.
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>Delete any saved product or comparison from your library at any time.</li>
            <li>
              Remove the extension from chrome://extensions at any time; that also removes its stored preferences.
            </li>
            <li>
              To delete your account and everything in it, or to ask what Picky holds about you,{" "}
              <a href={PRIVACY_CONTACT_URL} target="_blank" rel="noreferrer">
                contact us
              </a>
              . We act on requests within 30 days.
            </li>
          </ul>

          <h2>Changes</h2>
          <p>
            If this policy changes, the new version will be posted here with a new date. Material changes will be
            announced in the app before they take effect.
          </p>
        </article>
      </main>
    </>
  );
}
