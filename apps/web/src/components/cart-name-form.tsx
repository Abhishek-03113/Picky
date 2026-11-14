import { useId, useState, type FormEvent } from "react";

interface CartNameFormProps {
  /** Pre-filled name, e.g. "Cart 2". */
  initialName?: string;
  isPending: boolean;
  errorMessage: string | null;
  onCreate: (name: string) => void;
  onCancel: () => void;
}

/** Inline "name it, then create" row for a new cart (carts index and "New cart…" in add-to-cart menus). */
export function CartNameForm({ initialName = "", isPending, errorMessage, onCreate, onCancel }: CartNameFormProps) {
  const [name, setName] = useState(initialName);
  const inputId = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() !== "") onCreate(name.trim());
  };
  return (
    <form className="new-comparison-form cart-name-form" onSubmit={submit}>
      <label className="visually-hidden" htmlFor={inputId}>
        Cart name
      </label>
      <input
        id={inputId}
        autoFocus
        required
        maxLength={120}
        placeholder="Name this cart"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === "Escape" && onCancel()}
      />
      <button type="submit" className="pill-button" disabled={isPending || name.trim() === ""}>
        {isPending ? "Creating…" : "Create"}
      </button>
      <button type="button" className="text-button" onClick={onCancel}>
        Cancel
      </button>
      {errorMessage !== null && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
