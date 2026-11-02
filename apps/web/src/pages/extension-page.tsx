import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { currentUserQuery } from "../api/auth-queries.ts";
import { PRIVACY_PATH, SIGN_IN_PATH } from "../auth/route-guards.ts";
import { AppBar, BrandLink, SiteNav } from "../components/app-bar.tsx";
import { CheckIcon } from "../components/icons.tsx";
import { SetupSteps } from "../components/setup-steps.tsx";
import { EXTENSION_GESTURES, SETUP_STEPS } from "../extension/extension-setup.ts";
import { usePageTitle } from "../hooks/use-page-title.ts";

const extensionRouteApi = getRouteApi("/extension");

/** Install guide for the Chrome extension: store link, setup steps, shortcuts and what it can see. */
export function ExtensionPage() {
  usePageTitle("Chrome extension");
  const { config, extensionBridge, authClient } = extensionRouteApi.useRouteContext();
  const { data: user } = useSuspenseQuery(currentUserQuery(authClient));
  return (
    <>
      <AppBar>
        <BrandLink />
        <SiteNav />
      </AppBar>
      <main className="page narrow extension-guide">
        <div className="page-head-text">
          <h1 className="page-title">Get the Picky extension</h1>
          <p className="subtle">
            It reads the product page you are on and turns it into a clean spec sheet. Free, for Chrome and other
            Chromium browsers.
          </p>
        </div>
        {extensionBridge.isAvailable() ? (
          <InstalledCard signedIn={user !== null} />
        ) : (
          <InstallCard extensionUrl={config.extensionUrl} />
        )}
        <section className="card guide-card" aria-labelledby="setup-title">
          <h2 id="setup-title">Set it up in a minute</h2>
          <SetupSteps steps={SETUP_STEPS} />
        </section>
        <section className="card guide-card" aria-labelledby="gestures-title">
          <h2 id="gestures-title">On a product page</h2>
          <dl className="gesture-list">
            {EXTENSION_GESTURES.map((gesture) => (
              <div key={gesture.keys}>
                <dt>
                  <kbd>{gesture.keys}</kbd>
                </dt>
                <dd>{gesture.action}</dd>
              </div>
            ))}
          </dl>
          <p className="hint">
            Change the shortcuts at <code>chrome://extensions/shortcuts</code>.
          </p>
        </section>
        <section className="card guide-card" aria-labelledby="access-title">
          <h2 id="access-title">What it can see</h2>
          <ul className="guide-points">
            <li>Only Amazon.in and Flipkart pages, and this site. It never runs anywhere else.</li>
            <li>It reads a page when you ask: the toolbar button, a shortcut, Alt+click or the right-click menu.</li>
            <li>What you save goes to your Picky account and nowhere else. No ads, no tracking, nothing sold.</li>
          </ul>
          <p className="hint">
            Details in the <Link to={PRIVACY_PATH}>privacy policy</Link>.
          </p>
        </section>
      </main>
    </>
  );
}

function InstallCard({ extensionUrl }: { extensionUrl: string }) {
  return (
    <section className="card install-card" aria-label="Install">
      <a className="primary-button" href={extensionUrl} target="_blank" rel="noreferrer">
        Add to Chrome, it's free
      </a>
      <p className="hint">
        Installed it already? Picky notices on a fresh page:{" "}
        <button type="button" className="inline-link-button" onClick={() => window.location.reload()}>
          reload this page
        </button>
        .
      </p>
    </section>
  );
}

function InstalledCard({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="card install-card is-installed" aria-label="Installed">
      <p className="extension-ready">
        <CheckIcon size={16} /> Picky is installed in this browser.
      </p>
      {signedIn ? (
        <Link className="primary-button" to="/">
          Go to your library
        </Link>
      ) : (
        <>
          <Link className="primary-button" to={SIGN_IN_PATH} search={{ mode: "signup" }}>
            Create your free account
          </Link>
          <p className="hint">Reading specs works now. An account lets you save and compare.</p>
        </>
      )}
    </section>
  );
}
