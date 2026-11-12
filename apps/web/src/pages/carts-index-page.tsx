import { AppBar, BrandLink, MainNav } from "../components/app-bar.tsx";
import { usePageTitle } from "../hooks/use-page-title.ts";

/** /carts: every cart, plus "New cart". */
export function CartsIndexPage() {
  usePageTitle("Carts");
  return (
    <>
      <AppBar sticky>
        <BrandLink />
        <MainNav />
      </AppBar>
      <main className="carts-index">
        <h1 className="page-title">Carts</h1>
      </main>
    </>
  );
}
