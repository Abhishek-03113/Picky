import { pluralize, type CatalogComparisonSummary, type CatalogProductSummary } from "@picky/catalog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { cartListQuery } from "../api/cart-queries.ts";
import { useDeleteProducts } from "../hooks/use-delete-products.ts";
import { useAddProductsToComparison, useCreateComparison } from "../hooks/use-comparison-mutations.ts";
import { nameForSelection } from "../library/selection.ts";
import { AddToComparisonMenu } from "./add-to-comparison-menu.tsx";
import { CartChooser } from "./cart-chooser.tsx";

interface SelectionBarProps {
  selectedProducts: readonly CatalogProductSummary[];
  comparisons: readonly CatalogComparisonSummary[];
  onClear: () => void;
  /** Called with the comparison's or cart's name once the selection is in it. */
  onAdded: (name: string) => void;
}

const rootRouteApi = getRouteApi("__root__");

/** Floating bar while products are selected: "N selected · Clear · Delete · Add to cart · Add to comparison… · Compare N". */
export function SelectionBar({ selectedProducts, comparisons, onClear, onAdded }: SelectionBarProps) {
  if (selectedProducts.length === 0) return null;
  return (
    <SelectionBarContent
      selectedProducts={selectedProducts}
      comparisons={comparisons}
      onClear={onClear}
      onAdded={onAdded}
    />
  );
}

function SelectionBarContent({ selectedProducts, comparisons, onClear, onAdded }: SelectionBarProps) {
  const createComparison = useCreateComparison();
  const addProducts = useAddProductsToComparison();
  const productIds = selectedProducts.map((product) => product.id);
  const name = nameForSelection(selectedProducts);
  const deleteProducts = useDeleteProducts();
  const confirmDelete = () => {
    const message = `Delete ${pluralize(productIds.length, "saved product")}? They also leave any comparison they are in.`;
    if (window.confirm(message)) deleteProducts.mutate(productIds, { onSuccess: onClear });
  };
  const create = () => createComparison.mutate({ name, productIds });
  const addTo = (comparison: CatalogComparisonSummary) =>
    addProducts.mutate({ comparisonId: comparison.id, productIds }, { onSuccess: () => onAdded(comparison.name) });
  return (
    <div role="region" aria-label="Selection" className="selection-bar">
      <span className="selection-count">{selectedProducts.length} selected</span>
      <button type="button" className="selection-clear" onClick={onClear}>
        Clear
      </button>
      <button type="button" className="selection-delete" disabled={deleteProducts.isPending} onClick={confirmDelete}>
        Delete
      </button>
      <SelectionCartChooser productIds={productIds} onAdded={onAdded} />
      <AddToComparisonMenu comparisons={comparisons} newName={name} onAddTo={addTo} onCreateNew={create} />
      <button type="button" className="selection-compare" disabled={createComparison.isPending} onClick={create}>
        Compare {selectedProducts.length}
      </button>
    </div>
  );
}

interface SelectionCartChooserProps {
  productIds: readonly string[];
  onAdded: (cartName: string) => void;
}

function SelectionCartChooser({ productIds, onAdded }: SelectionCartChooserProps) {
  const { cartsClient } = rootRouteApi.useRouteContext();
  const { data: carts } = useSuspenseQuery(cartListQuery(cartsClient));
  return (
    <CartChooser
      carts={carts}
      productIds={productIds}
      placement="above"
      triggerClassName="selection-add"
      onAdded={onAdded}
    />
  );
}
