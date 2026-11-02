import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { EXTENSION_PATH, PRIVACY_PATH, SIGN_IN_PATH } from "../../auth/route-guards.ts";

/** Disclaimer and secondary links. */
export function SiteFooter(): ReactElement {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span>Picky is not affiliated with Amazon or Flipkart.</span>
        <span className="footer-links">
          <Link to={PRIVACY_PATH}>Privacy</Link>
          <Link to={EXTENSION_PATH}>Chrome extension</Link>
          <Link to={SIGN_IN_PATH} search={{}}>
            Sign in
          </Link>
        </span>
      </div>
    </footer>
  );
}
