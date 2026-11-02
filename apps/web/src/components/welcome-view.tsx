import { Link } from "@tanstack/react-router";
import { EXTENSION_PATH } from "../auth/route-guards.ts";
import { QUICK_SETUP_STEPS } from "../extension/extension-setup.ts";
import { CheckIcon, DocumentIcon } from "./icons.tsx";
import { ImportProductForm } from "./import-product-form.tsx";
import { SetupSteps } from "./setup-steps.tsx";

interface WelcomeViewProps {
  extensionUrl: string;
  extensionInstalled: boolean;
  autoImportUrl?: string | undefined;
}

function ExtensionCard({ extensionUrl, installed }: { extensionUrl: string; installed: boolean }) {
  if (installed) {
    return (
      <section className="card extension-card" aria-labelledby="extension-title">
        <div className="extension-card-text">
          <h2 id="extension-title" className="extension-ready">
            <CheckIcon size={16} /> The Picky extension is installed
          </h2>
          <span className="subtle">
            Open any Amazon.in or Flipkart product and click Picky, or right-click → Add to Picky to save it here.
          </span>
        </div>
      </section>
    );
  }
  return (
    <section className="card extension-card" aria-labelledby="extension-title">
      <div className="extension-card-head">
        <div className="extension-card-text">
          <h2 id="extension-title">Faster: use the Chrome extension</h2>
          <span className="subtle">
            One click on the product page you're already on. <Link to={EXTENSION_PATH}>Setup guide</Link>
          </span>
        </div>
        <a className="soft-button" href={extensionUrl} target="_blank" rel="noreferrer">
          Add to Chrome
        </a>
      </div>
      <SetupSteps steps={QUICK_SETUP_STEPS} />
    </section>
  );
}

/** First-run screen for an empty library: paste a link, or install the extension. */
export function WelcomeView({ extensionUrl, extensionInstalled, autoImportUrl }: WelcomeViewProps) {
  return (
    <main className="page narrow welcome">
      <div className="welcome-intro">
        <span className="welcome-badge">
          <DocumentIcon size={36} />
        </span>
        <h1>Welcome to Picky</h1>
        <p>Your library is empty. Add your first product and its spec sheet will show up here.</p>
      </div>
      <ImportProductForm variant="card" autoImportUrl={autoImportUrl} />
      <ExtensionCard extensionUrl={extensionUrl} installed={extensionInstalled} />
    </main>
  );
}
