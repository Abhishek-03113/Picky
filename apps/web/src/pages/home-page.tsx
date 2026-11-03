import { getRouteApi } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { AppBar, BrandLink, PublicNav } from "../components/app-bar.tsx";
import { BeforeAfter } from "../components/home/before-after.tsx";
import { ComparePreview } from "../components/home/compare-preview.tsx";
import { Features } from "../components/home/features.tsx";
import { FinalCta } from "../components/home/final-cta.tsx";
import { Hero } from "../components/home/hero.tsx";
import { HowItWorks } from "../components/home/how-it-works.tsx";
import { Problem } from "../components/home/problem.tsx";
import { SiteFooter } from "../components/home/site-footer.tsx";
import { SupportedSites } from "../components/home/supported-sites.tsx";
import { usePageTitle } from "../hooks/use-page-title.ts";

const rootRouteApi = getRouteApi("__root__");

/** What a signed-out visitor sees at "/": what Picky does, then a way in (account, extension). */
export function HomePage(): ReactElement {
  const { os } = rootRouteApi.useRouteContext();
  usePageTitle("Stop opening more tabs");
  return (
    <div className="home">
      <AppBar sticky>
        <BrandLink />
        <PublicNav withSections />
      </AppBar>
      <main>
        <Hero />
        <Problem />
        <BeforeAfter />
        <HowItWorks os={os} />
        <ComparePreview />
        <Features />
        <SupportedSites />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
