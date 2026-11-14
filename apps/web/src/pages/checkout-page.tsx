import {
  buildCheckoutPlan,
  formatMoney,
  pluralize,
  type CartItem,
  type CheckoutPlan,
  type SkippedReason,
} from "@picky/catalog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { cartDetailQuery } from "../api/cart-queries.ts";
import { AppBar, MainNav } from "../components/app-bar.tsx";
import { CheckoutStoreRow } from "../components/checkout-store-row.tsx";
import { ChevronLeftIcon } from "../components/icons.tsx";
import { usePageTitle } from "../hooks/use-page-title.ts";

const checkoutRouteApi = getRouteApi("/carts/$cartId/checkout");

const SKIP_REASONS: Record<SkippedReason, string> = {
  "out-of-stock": "Out of stock",
};

function doneKey(cartId: string): string {
  return `picky:checkout-done:${cartId}`;
}

function readDone(cartId: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(doneKey(cartId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function writeDone(cartId: string, sources: readonly string[]): void {
  try {
    window.localStorage.setItem(doneKey(cartId), JSON.stringify(sources));
  } catch {
    // Storage can be blocked; the ticks then last only for this visit.
  }
}

/** /carts/$cartId/checkout: opens the cart store by store and keeps track of which stores are done. */
export function CheckoutPage() {
  const { cartId } = checkoutRouteApi.useParams();
  const { cartsClient } = checkoutRouteApi.useRouteContext();
  const { data: cart } = useSuspenseQuery(cartDetailQuery(cartsClient, cartId));
  const plan = buildCheckoutPlan(cart.items);
  const [doneSources, setDoneSources] = useState(() => readDone(cartId));
  usePageTitle(`Checkout · ${cart.name}`);
  const toggle = (source: string, done: boolean) => {
    const next = done ? [...new Set([...doneSources, source])] : doneSources.filter((entry) => entry !== source);
    setDoneSources(next);
    writeDone(cartId, next);
  };
  const doneCount = plan.steps.filter((step) => doneSources.includes(step.source)).length;
  return (
    <>
      <AppBar sticky>
        <Link to="/carts/$cartId" params={{ cartId }} className="back-link">
          <ChevronLeftIcon size={20} />
          {cart.name}
        </Link>
        <MainNav />
      </AppBar>
      <main className="page wide checkout-page">
        <div className="page-head-text">
          <h1 className="page-title">Checkout</h1>
          <p className="subtle">Open each store, pay there, then tick it off.</p>
        </div>
        {plan.steps.length > 0 && <Progress done={doneCount} total={plan.steps.length} />}
        <div className="checkout-layout">
          <div className="checkout-steps">
            {plan.steps.length === 0 && (
              <p className="card error-panel subtle">Nothing in this cart can be bought right now.</p>
            )}
            {plan.steps.map((step) => (
              <CheckoutStoreRow
                key={step.source}
                step={step}
                items={cart.items.filter((item) => item.product.snapshot.source === step.source && !isSkipped(plan, item))}
                done={doneSources.includes(step.source)}
                onToggleDone={(done) => toggle(step.source, done)}
              />
            ))}
            {plan.skipped.length > 0 && <LeftOut skipped={plan.skipped} />}
          </div>
          <SidePanel plan={plan} />
        </div>
      </main>
    </>
  );
}

function isSkipped(plan: CheckoutPlan, item: CartItem): boolean {
  return plan.skipped.some((entry) => entry.item === item);
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="checkout-progress">
      <p className="hint">{`${done} of ${pluralize(total, "store")} done`}</p>
      <progress value={done} max={total} aria-label={`${done} of ${pluralize(total, "store")} done`} />
    </div>
  );
}

function LeftOut({ skipped }: { skipped: CheckoutPlan["skipped"] }) {
  return (
    <section className="card checkout-step" aria-label="Left out of this checkout">
      <h2 className="checkout-step-name">Left out of this checkout</h2>
      <ul className="plain-links">
        {skipped.map(({ item, reason }) => (
          <li key={item.product.id}>
            <Link to="/products/$productId" params={{ productId: item.product.id }}>
              {item.product.snapshot.title}
            </Link>
            <span className="hint">{` · ${SKIP_REASONS[reason]}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SidePanel({ plan }: { plan: CheckoutPlan }) {
  return (
    <aside className="card checkout-side" aria-label="Totals">
      <h2 className="checkout-step-name">By store</h2>
      {plan.steps.map((step) => (
        <p key={step.source} className="cart-total-line">
          <span>{step.label}</span>
          <strong>{step.subtotals.length === 0 ? "Price not listed" : step.subtotals.map(formatMoney).join(" + ")}</strong>
        </p>
      ))}
      <p className="hint">Items total, before delivery and tax. Each store shows its final amount.</p>
      <p className="hint">Picky never sees your payment details and adds nothing to the store&apos;s links.</p>
    </aside>
  );
}
