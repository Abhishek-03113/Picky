import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { routeErrorMessage } from "../format/shopper-error.ts";
import { AppBar, BrandLink } from "./app-bar.tsx";

/** Shown when a route loader fails: what happened, in the shopper's words, plus a way back. */
export function RouteErrorPanel({ error }: ErrorComponentProps) {
  return (
    <div className="app">
      <AppBar>
        <BrandLink />
      </AppBar>
      <main className="page narrow">
        <div className="card error-panel" role="alert">
          <h2>Couldn't load this page</h2>
          <p>{routeErrorMessage(error)}</p>
          <Link to="/">Back to saved products</Link>
        </div>
      </main>
    </div>
  );
}
