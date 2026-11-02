import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { currentUserQuery } from "../api/auth-queries.ts";
import { comparisonListQuery } from "../api/comparison-queries.ts";
import { EXTENSION_PATH, SIGN_IN_PATH } from "../auth/route-guards.ts";
import { useSignOut } from "../hooks/use-session.ts";
import { LogoMark } from "./icons.tsx";
import { ThemeToggle } from "./theme-toggle.tsx";

/** Logo mark plus wordmark, linking home. */
export function BrandLink() {
  return (
    <Link to="/" className="brand">
      <LogoMark />
      <span className="brand-name">Picky</span>
    </Link>
  );
}

const rootRouteApi = getRouteApi("__root__");

/** Library and Comparisons links (Comparisons carries the number of saved comparisons), then Sign out. */
export function MainNav() {
  const { comparisonsClient } = rootRouteApi.useRouteContext();
  const { data: comparisons } = useSuspenseQuery(comparisonListQuery(comparisonsClient));
  return (
    <nav aria-label="Main" className="main-nav">
      <Link to="/" className="nav-link" activeOptions={{ exact: true }} activeProps={{ "aria-current": "page" }}>
        Library
      </Link>
      <Link to="/comparisons" className="nav-link" activeProps={{ "aria-current": "page" }}>
        Comparisons
        <span className="nav-count">{comparisons.length}</span>
      </Link>
      <SignOutButton />
    </nav>
  );
}

/**
 * Nav for visitors: the extension guide, Sign in and a Get started button. The homepage also links its
 * own sections.
 */
export function PublicNav({ withSections = false }: { withSections?: boolean }) {
  return (
    <nav aria-label="Main" className="main-nav public-nav">
      {withSections ? (
        <>
          <a className="nav-link nav-link-section" href="#how">
            How it works
          </a>
          <a className="nav-link nav-link-section" href="#compare">
            Compare
          </a>
        </>
      ) : null}
      <Link to={EXTENSION_PATH} className="nav-link nav-link-section" activeProps={{ "aria-current": "page" }}>
        Extension
      </Link>
      <Link to={SIGN_IN_PATH} search={{}} className="nav-link">
        Sign in
      </Link>
      <Link to={SIGN_IN_PATH} search={{ mode: "signup" }} className="pill-button">
        Get started
      </Link>
    </nav>
  );
}

/**
 * The right nav for a page anyone may open (/extension, /privacy): the app's nav when signed in,
 * otherwise the visitor's.
 */
export function SiteNav() {
  const { authClient } = rootRouteApi.useRouteContext();
  const { data: user } = useSuspenseQuery(currentUserQuery(authClient));
  return user === null ? <PublicNav /> : <MainNav />;
}

/** Ends the session; the tooltip says whose. */
function SignOutButton() {
  const { authClient } = rootRouteApi.useRouteContext();
  const { data: user } = useSuspenseQuery(currentUserQuery(authClient));
  const signOut = useSignOut();
  return (
    <button
      type="button"
      className="nav-link nav-button"
      title={user === null ? undefined : `Signed in as ${user.email}`}
      disabled={signOut.isPending}
      onClick={() => signOut.mutate()}
    >
      Sign out
    </button>
  );
}

/** Frosted top bar; each page decides what goes inside it. */
export function AppBar({ children, sticky = false }: { children: ReactNode; sticky?: boolean }) {
  return (
    <header className={sticky ? "app-bar sticky" : "app-bar"}>
      <div className="app-bar-inner">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
