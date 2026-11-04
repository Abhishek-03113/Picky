import {
  type CatalogProduct,
  type ComparisonGroup,
  type ComparisonMatrix,
  pluralize,
  searchableSites,
  storeSearchUrl,
  type SupportedSite,
} from "@picky/catalog";
import type { CSSProperties } from "react";
import { ExternalLinkIcon } from "./icons.tsx";
import { MatrixRow } from "./comparison-cells.tsx";
import { ComparisonProductHeader } from "./comparison-product-header.tsx";

interface ComparisonMatrixViewProps {
  products: readonly CatalogProduct[];
  matrix: ComparisonMatrix;
  markBest: boolean;
  differencesOnly: boolean;
  onRemove: (productId: string) => void;
}

/** One column per product, sized by a CSS variable; the scroll box lets narrow screens pan sideways. */
function columnStyle(count: number): CSSProperties {
  return { "--columns": count } as CSSProperties;
}

/** The comparison table: sticky product header, Price section, then spec groups. */
export function ComparisonMatrixView({
  products,
  matrix,
  markBest,
  differencesOnly,
  onRemove,
}: ComparisonMatrixViewProps) {
  return (
    <section aria-label="Comparison table" className="matrix-scroll">
      <div className="mx mx-head" style={columnStyle(products.length)}>
        <div className="mx-corner">Comparing {pluralize(products.length, "product")}</div>
        {products.map((product) => (
          <ComparisonProductHeader key={product.id} product={product} onRemove={() => onRemove(product.id)} />
        ))}
      </div>
      <div role="table" aria-label="Details" className="mx" style={columnStyle(products.length)}>
        <PriceSection products={products} matrix={matrix} markBest={markBest} />
        {matrix.groups.map((group) => (
          <SpecGroupRows key={group.title} group={group} markBest={markBest} />
        ))}
        {differencesOnly && matrix.groups.every((group) => group.rows.length === 0) && (
          <p className="mx-note">No differences: every detail matches. Switch to “All details” to see them.</p>
        )}
      </div>
    </section>
  );
}

function PriceSection({
  products,
  matrix,
  markBest,
}: Pick<ComparisonMatrixViewProps, "products" | "matrix" | "markBest">) {
  return (
    <>
      <div className="mx-group">Price</div>
      <MatrixRow label="Price" cells={matrix.prices} markBest={markBest} pill="Lowest" />
      <MatrixRow label="Rating" cells={matrix.ratings} markBest={markBest} pill={null} />
      {searchableSites().map((site) => (
        <div key={site.source} role="row" className="mx-row">
          <div role="rowheader" className="mx-label">
            {site.label}
          </div>
          {products.map((product) => (
            <StoreSearchCell key={product.id} site={site} product={product} />
          ))}
        </div>
      ))}
    </>
  );
}

/** "Saved from here" when the product is from this store, else a search there for the same product. */
function StoreSearchCell({ site, product }: { site: SupportedSite; product: CatalogProduct }) {
  if (product.snapshot.source === site.source) {
    return (
      <div role="cell" className="mx-value none">
        Saved from here
      </div>
    );
  }
  const searchUrl = storeSearchUrl(site, product.snapshot);
  if (searchUrl === null) return <div role="cell" className="mx-value none" />;
  return (
    <div role="cell" className="mx-value">
      <a href={searchUrl} target="_blank" rel="noreferrer" className="mx-link">
        {`Search ${site.label}`} <ExternalLinkIcon size={12} />
      </a>
    </div>
  );
}

function SpecGroupRows({ group, markBest }: { group: ComparisonGroup; markBest: boolean }) {
  if (group.rows.length === 0) return null;
  return (
    <>
      <div className="mx-group">
        {group.title}
        {group.identicalCount > 0 && <span className="mx-hidden">{group.identicalCount} the same on all, hidden</span>}
      </div>
      {group.rows.map((row) => (
        <MatrixRow key={row.key} label={row.label} cells={row.cells} markBest={markBest} pill="Best" />
      ))}
    </>
  );
}
