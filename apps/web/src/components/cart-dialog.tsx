import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons.tsx";

interface CartDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** A modal sheet over the page: closes on Escape, a press on the backdrop, or the close button. */
export function CartDialog({ title, onClose, children }: CartDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog !== null && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="cart-dialog"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="cart-dialog-body">
        <div className="cart-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="cart-dialog-close" aria-label="Close" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
