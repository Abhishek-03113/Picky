import { CloseIcon } from "./icons.tsx";

interface CartRemovedRowProps {
  title: string;
  isRestoring: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

/** The note left where an item was removed: "Removed “…”." with Undo, until dismissed. */
export function CartRemovedRow({ title, isRestoring, onUndo, onDismiss }: CartRemovedRowProps) {
  return (
    <div className="cart-removed" role="status">
      <span className="cart-removed-text">Removed “{title}”.</span>
      <button type="button" className="text-button" disabled={isRestoring} onClick={onUndo}>
        {isRestoring ? "Putting back…" : "Undo"}
      </button>
      <button type="button" className="icon-button" aria-label="Dismiss" onClick={onDismiss}>
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
