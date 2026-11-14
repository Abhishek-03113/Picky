import type { CatalogCartSummary } from "@picky/catalog";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateComparison } from "../hooks/use-comparison-mutations.ts";
import { ExportMenu } from "./export-menu.tsx";
import { ImportCartDialog } from "./import-cart-dialog.tsx";
import { ShareCartDialog } from "./share-cart-dialog.tsx";

/** A comparison needs at least two products to compare. */
const MIN_COMPARED = 2;

interface CartHeaderActionsProps {
  cartId: string;
  cartName: string;
  shareSlug: string | null;
  /** Every cart, for Import's "merge into" choice. */
  carts: readonly CatalogCartSummary[];
  /** Ticked rows, in cart order. */
  selectedProductIds: readonly string[];
}

/** The cart header's buttons: Compare selected, Share, Import, Export and Checkout. */
export function CartHeaderActions({ cartId, cartName, shareSlug, carts, selectedProductIds }: CartHeaderActionsProps) {
  const [dialog, setDialog] = useState<"share" | "import" | null>(null);
  const close = () => setDialog(null);
  return (
    <div className="cart-header-actions">
      <CompareSelectedButton cartName={cartName} productIds={selectedProductIds} />
      <button type="button" className="soft-button" onClick={() => setDialog("share")}>
        Share
      </button>
      <button type="button" className="soft-button" onClick={() => setDialog("import")}>
        Import
      </button>
      <ExportMenu cartId={cartId} />
      <Link to="/carts/$cartId/checkout" params={{ cartId }} className="pill-button cart-checkout-pill">
        Checkout
      </Link>
      {dialog === "share" && <ShareCartDialog cartId={cartId} shareSlug={shareSlug} onClose={close} />}
      {dialog === "import" && <ImportCartDialog carts={carts} defaultCartId={cartId} onClose={close} />}
    </div>
  );
}

interface CompareSelectedButtonProps {
  cartName: string;
  productIds: readonly string[];
}

/** Makes a comparison, named after the cart, of the ticked items and opens it. */
function CompareSelectedButton({ cartName, productIds }: CompareSelectedButtonProps) {
  const createComparison = useCreateComparison();
  const enoughTicked = productIds.length >= MIN_COMPARED;
  return (
    <button
      type="button"
      className="soft-button"
      disabled={!enoughTicked || createComparison.isPending}
      title={enoughTicked ? undefined : "Tick at least two items to compare them"}
      onClick={() => createComparison.mutate({ name: cartName, productIds })}
    >
      {enoughTicked ? `Compare ${productIds.length} selected` : "Compare selected"}
    </button>
  );
}
