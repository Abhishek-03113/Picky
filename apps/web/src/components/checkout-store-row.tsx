import { checkoutStepSummary, formatMoney, pluralize, type CheckoutStep } from "@picky/catalog";
import type { CartItem } from "@picky/catalog";

interface CheckoutStoreRowProps {
  step: CheckoutStep;
  /** The cart lines this step covers, listed under the button as plain links. */
  items: readonly CartItem[];
  done: boolean;
  onToggleDone: (done: boolean) => void;
}

/**
 * One store of a checkout: what it will open, the button that opens it, the items as plain links
 * and a "Done" checkbox for the shopper to tick once they have paid there.
 *
 * @example <CheckoutStoreRow step={step} items={items} done={false} onToggleDone={setDone} />
 */
export function CheckoutStoreRow({ step, items, done, onToggleDone }: CheckoutStoreRowProps) {
  const openAll = () => {
    for (const url of step.urls) window.open(url, "_blank", "noopener");
  };
  const buttonLabel =
    step.kind === "cart-link"
      ? `Open cart on ${step.label}`
      : `Open ${pluralize(step.urls.length, "item")} on ${step.label}`;
  return (
    <section className={`card checkout-step${done ? " is-done" : ""}`} aria-label={step.label}>
      <div className="checkout-step-head">
        <div>
          <h2 className="checkout-step-name">{step.label}</h2>
          <p className="hint">
            {pluralize(step.itemCount, "item")}
            {step.subtotals.length > 0 && ` · ${step.subtotals.map(formatMoney).join(" + ")}`}
          </p>
        </div>
        <label className="checkout-done">
          <input type="checkbox" checked={done} onChange={(event) => onToggleDone(event.target.checked)} />
          Done
        </label>
      </div>
      <p className="subtle">{checkoutStepSummary(step)}</p>
      <div>
        <button type="button" className="primary-button" onClick={openAll}>
          {buttonLabel}
        </button>
      </div>
      <ul className="plain-links">
        {items.map((item) => (
          <li key={item.product.id}>
            <a href={item.product.snapshot.url} target="_blank" rel="noreferrer">
              {item.product.snapshot.title}
            </a>
            <span className="hint">{` · Quantity ${item.quantity}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
