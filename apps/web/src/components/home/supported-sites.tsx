import { supportedStoresText } from "@picky/catalog/sites";
import type { ReactElement } from "react";
import { TickIcon } from "./home-icons.tsx";
import { SUPPORTED_SITES, type SupportedSite } from "./supported-sites-list.ts";

/** "Works where you shop". Sites are injectable so tests need not depend on the real list. */
export function SupportedSites({
  sites = SUPPORTED_SITES,
}: {
  readonly sites?: readonly SupportedSite[];
}): ReactElement {
  return (
    <section id="sites" className="section sites" aria-labelledby="sites-title">
      <div className="sites-copy">
        <h2 id="sites-title" className="h2">
          The store is where you buy. Picky is where you decide.
        </h2>
        <p className="sub">{`Today it works on ${supportedStoresText()}. Comparing across stores is coming.`}</p>
      </div>
      <ul className="site-list">
        {sites.map((site) => (
          <li key={site.name}>
            <TickIcon />
            {site.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
