import { CloseIcon, MinusIcon, PlusIcon } from "./icons.tsx";

export const MIN_CART_QUANTITY = 1;
export const MAX_CART_QUANTITY = 99;

interface CartQuantityStepperProps {
  quantity: number;
  /** Product title, so each button says what it changes. */
  title: string;
  onChange: (quantity: number) => void;
  /** When set, "−" at quantity 1 takes the item out instead of being disabled. */
  onRemove?: () => void;
  disabled?: boolean;
}

/** "− 2 +" stepper for one cart item, 1 to 99. */
export function CartQuantityStepper({ quantity, title, onChange, onRemove, disabled = false }: CartQuantityStepperProps) {
  const atMin = quantity <= MIN_CART_QUANTITY;
  const decrease = () => (atMin ? onRemove?.() : onChange(quantity - 1));
  return (
    <span className="cart-stepper" role="group" aria-label={`Quantity of ${title}`}>
      <button
        type="button"
        className="cart-stepper-button"
        aria-label={atMin && onRemove !== undefined ? `Remove ${title} from the cart` : `One fewer ${title}`}
        disabled={disabled || (atMin && onRemove === undefined)}
        onClick={decrease}
      >
        {atMin && onRemove !== undefined ? <CloseIcon size={12} /> : <MinusIcon size={12} />}
      </button>
      <output className="cart-stepper-value" aria-live="polite">
        {quantity}
      </output>
      <button
        type="button"
        className="cart-stepper-button"
        aria-label={`One more ${title}`}
        disabled={disabled || quantity >= MAX_CART_QUANTITY}
        onClick={() => onChange(quantity + 1)}
      >
        <PlusIcon size={12} />
      </button>
    </span>
  );
}

