import { Link } from "@tanstack/react-router";
import { EXTENSION_PATH } from "../auth/route-guards.ts";
import { AppBar, BrandLink, SiteNav } from "../components/app-bar.tsx";
import { usePageTitle } from "../hooks/use-page-title.ts";

/** Where privacy questions and deletion requests go; also linked from the Chrome Web Store listing. */
export const PRIVACY_CONTACT_URL = "https://github.com/Abhishek-03113/Picky/issues";
const LAST_UPDATED = "2 November 2026";

/**
 * Privacy policy for the web app and the Chrome extension, in plain language for users. The Chrome Web
 * Store requires one, and its "Privacy practices" answers must match it (docs/chrome-web-store.md).
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
            Picky helps you save, understand and compare products while you shop online. This policy explains what
            information Picky collects, why, and the choices you have. It applies to the Picky website and the{" "}
            <Link to={EXTENSION_PATH}>Picky browser extension</Link>.
          </p>
          <p>
            In short: Picky collects only what it needs to give you your library and comparisons, uses it only for that,
            and never sells it.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Account information.</strong> Your email address and password when you create an account. Your
              password is protected and is never stored in a form anyone can read.
            </li>
            <li>
              <strong>Products you save.</strong> When you save a product, Picky keeps the details shown on its page,
              such as the name, brand, price, rating, pictures, highlights and specifications, along with a link to the
              page and the date you saved it.
            </li>
            <li>
              <strong>Comparisons you create.</strong> The names you give your comparisons and the products in them.
            </li>
            <li>
              <strong>Extension preferences.</strong> A few settings, such as the comparison you used last, kept on your
              own device.
            </li>
          </ul>
          <p>Picky does not ask for your name, phone number, address, location or payment details.</p>

          <h2>How the browser extension works</h2>
          <ul>
            <li>It works only on Amazon.in, Flipkart and the Picky website, and nowhere else.</li>
            <li>It looks at a product page only when you ask it to, for example by clicking the Picky button.</li>
            <li>Viewing a product's specs with Quick Look happens entirely in your browser. Nothing is saved.</li>
            <li>It saves a product to your account only when you choose to save it.</li>
            <li>It does not track the sites you visit or collect your browsing history.</li>
          </ul>

          <h2>How we use your information</h2>
          <ul>
            <li>To show you your saved products and comparisons on any device you sign in from.</li>
            <li>To keep you signed in and to keep your account secure.</li>
            <li>To keep Picky working well and to fix problems.</li>
            <li>To tell you about important changes to Picky or to this policy.</li>
          </ul>
          <p>
            We never use your information for advertising, to decide creditworthiness or lending, or for anything
            unrelated to Picky.
          </p>

          <h2>How we share your information</h2>
          <ul>
            <li>We do not sell, rent or trade your information.</li>
            <li>We do not show ads, and we do not use advertising or tracking services.</li>
            <li>
              We work with a small number of trusted service providers that host Picky for us. They may handle your
              information only to run Picky on our behalf.
            </li>
            <li>We may disclose information if the law requires it.</li>
          </ul>

          <h2>How long we keep it</h2>
          <p>
            We keep your information for as long as you have a Picky account. Anything you delete from your library is
            removed. If you ask us to delete your account, we delete it and everything in it within 30 days.
          </p>

          <h2>Keeping it safe</h2>
          <p>
            We use industry-standard safeguards to protect your information, and access to it is limited to what is
            needed to run Picky. No online service can promise perfect security, but we take it seriously and will tell
            you promptly if a problem affects your account.
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>Remove any saved product or comparison from your library at any time.</li>
            <li>Uninstall the extension at any time. Its preferences are removed with it.</li>
            <li>
              Ask for a copy of the information Picky holds about you, ask us to correct it, or ask us to delete your
              account by{" "}
              <a href={PRIVACY_CONTACT_URL} target="_blank" rel="noreferrer">
                contacting us
              </a>
              . We respond within 30 days.
            </li>
          </ul>

          <h2>Children</h2>
          <p>
            Picky is meant for adults. If you are under 18, please use Picky only with the consent of a parent or
            guardian.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If we update this policy, we will post the new version here and change the date at the top. If a change is
            significant, we will let you know in Picky before it takes effect.
          </p>

          <h2>Contact us</h2>
          <p>
            Questions about this policy or your information?{" "}
            <a href={PRIVACY_CONTACT_URL} target="_blank" rel="noreferrer">
              Get in touch
            </a>
            .
          </p>

          <p className="hint">Picky is not affiliated with Amazon or Flipkart.</p>
        </article>
      </main>
    </>
  );
}
