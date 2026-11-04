import { supportedStoresText } from "@picky/catalog/sites";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { EXTENSION_PATH, SIGN_IN_PATH } from "../../auth/route-guards.ts";
import { DownloadIcon } from "./home-icons.tsx";

/** Headline, the two ways in (an account, the extension) and the mascot. */
export function Hero(): ReactElement {
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          Stop shopping by opening more tabs.
          <span className="hero-turn">Start making better decisions.</span>
        </h1>
        <p className="lede">
          Picky saves products as you browse, turns each one into a clean spec sheet, and shows where your shortlist
          really differs. For {supportedStoresText()}.
        </p>
        <div className="cta-row">
          <Link className="pill pill-large" to={SIGN_IN_PATH} search={{ mode: "signup" }}>
            Get started free
          </Link>
          <Link className="pill pill-large pill-quiet" to={EXTENSION_PATH}>
            <DownloadIcon />
            Add to Chrome
          </Link>
        </div>
        <p className="hero-note">
          Already have an account?{" "}
          <Link to={SIGN_IN_PATH} search={{}}>
            Sign in
          </Link>
          {" · "}
          <a href="#sample">See a sample sheet</a>
        </p>
      </div>
      <img
        className="hero-mascot"
        src="/mascot.png"
        width={640}
        height={640}
        alt="Picky, a cream bean wearing teal headphones"
      />
    </section>
  );
}
