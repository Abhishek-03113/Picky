import { supportedStoresText } from "@picky/catalog/sites";
import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import mascotUrl from "../../assets/mascot.webp";
import { EXTENSION_PATH, SIGN_IN_PATH } from "../../auth/route-guards.ts";
import { DownloadIcon } from "./home-icons.tsx";

/** Headline, the two ways in (an account, the extension) and the mascot. */
export function Hero(): ReactElement {
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">
          {`Compare ${supportedStoresText()} products without opening more tabs.`}
          <span className="hero-turn">Every detail, on one clean page.</span>
        </h1>
        <p className="lede">
          Picky saves products as you browse, puts your shortlist side by side, and points out where it really differs.
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
          <a href="#sample">See an example</a>
        </p>
      </div>
      <img
        className="hero-mascot"
        src={mascotUrl}
        fetchPriority="high"
        width={640}
        height={640}
        alt="Picky, a cream bean wearing teal headphones"
      />
    </section>
  );
}
