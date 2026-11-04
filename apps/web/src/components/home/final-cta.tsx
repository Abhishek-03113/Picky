import { supportedStoresText } from "@picky/catalog/sites";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { EXTENSION_PATH, SIGN_IN_PATH } from "../../auth/route-guards.ts";

/** The way in, in order: an account holds the library, the extension fills it. */
export function FinalCta(): ReactElement {
  return (
    <section id="start" className="section final-cta" aria-labelledby="final-title">
      <img src="/logo-128.png" width={72} height={72} alt="" className="final-mark" />
      <h2 id="final-title" className="h2 h2-large">
        Decide with confidence.
      </h2>
      <p className="sub">Set up in about a minute. Free, and no card needed.</p>
      <ol className="start-steps">
        <li>
          <span className="start-count" aria-hidden="true">
            1
          </span>
          <span className="start-title">Create your account</span>
          <span className="start-hint">Your library and comparisons live here, on any device.</span>
          <Link to={SIGN_IN_PATH} search={{ mode: "signup" }}>
            Sign up
          </Link>
        </li>
        <li>
          <span className="start-count" aria-hidden="true">
            2
          </span>
          <span className="start-title">Add the Chrome extension</span>
          <span className="start-hint">It reads the product page you are on. Pin it to keep it one click away.</span>
          <Link to={EXTENSION_PATH}>Install guide</Link>
        </li>
        <li>
          <span className="start-count" aria-hidden="true">
            3
          </span>
          <span className="start-title">Save your first product</span>
          <span className="start-hint">
            {`Open any ${supportedStoresText("or")} product and right-click → Add to Picky.`}
          </span>
        </li>
      </ol>
      <Link className="pill pill-large" to={SIGN_IN_PATH} search={{ mode: "signup" }}>
        Get started free
      </Link>
    </section>
  );
}
