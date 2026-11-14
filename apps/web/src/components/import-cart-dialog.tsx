import { pluralize } from "@picky/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CartDialog } from "./cart-dialog.tsx";

const rootRouteApi = getRouteApi("__root__");

interface ImportCartDialogProps {
  /** Carts the shopper may merge into. */
  carts: readonly { id: string; name: string }[];
  /** Pre-selected cart; null starts on "A new cart". */
  defaultCartId?: string | null;
  onClose: () => void;
}

/**
 * The share slug in whatever the shopper pasted: a full share link or a bare code. Null when it is neither.
 *
 * @example slugFromInput("https://picky.app/c/k3x9ab") // "k3x9ab"
 */
export function slugFromInput(text: string): string | null {
  const trimmed = text.trim();
  const fromLink = /\/c\/([A-Za-z0-9_-]+)/.exec(trimmed);
  if (fromLink !== null) return fromLink[1] ?? null;
  return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
}

/**
 * Brings a shared cart or a Picky file into the library: preview the shared cart, pick where it goes, import.
 *
 * @example <ImportCartDialog carts={carts} defaultCartId={cart.id} onClose={close} />
 */
export function ImportCartDialog({ carts, defaultCartId = null, onClose }: ImportCartDialogProps) {
  const { cartSharingClient } = rootRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [backup, setBackup] = useState<{ name: string; data: object } | null>(null);
  const [target, setTarget] = useState<string | null>(defaultCartId);
  const [fileError, setFileError] = useState(false);
  const slug = slugFromInput(text);
  const preview = useQuery({
    queryKey: ["shared-carts", slug],
    queryFn: () => cartSharingClient.readShared(slug ?? ""),
    enabled: slug !== null && backup === null,
    retry: false,
  });
  const importing = useMutation({
    mutationFn: () =>
      backup === null
        ? cartSharingClient.importCart({ slug: slug ?? "", cartId: target })
        : cartSharingClient.importCart({ backup: backup.data, cartId: target }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["carts"] }),
  });
  const chooseFile = async (file: File | undefined) => {
    setFileError(false);
    if (file === undefined) return;
    try {
      setBackup({ name: file.name, data: JSON.parse(await file.text()) as object });
      setText("");
    } catch {
      setBackup(null);
      setFileError(true);
    }
  };
  const canImport = backup !== null || preview.data !== undefined;
  const result = importing.data;
  return (
    <CartDialog title="Import a cart" onClose={onClose}>
      {result === undefined ? (
        <>
          <label className="field">
            <span className="field-label">Share link or code</span>
            <input
              type="text"
              value={text}
              placeholder="Paste a link or a code"
              onChange={(event) => {
                setText(event.target.value);
                setBackup(null);
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">Or a Picky file</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => void chooseFile(event.target.files?.[0])}
            />
          </label>
          {fileError && (
            <p className="form-error" role="alert">
              That file isn&apos;t a Picky file.
            </p>
          )}
          {backup !== null && <p className="hint">{`Ready to import ${backup.name}.`}</p>}
          {slug !== null && backup === null && preview.isError && (
            <p className="form-error" role="alert">
              This cart is no longer shared, or the code is wrong. Ask the person for a new link.
            </p>
          )}
          {preview.data !== undefined && backup === null && (
            <p className="import-preview">
              <strong>{preview.data.name}</strong>
              {` · ${pluralize(preview.data.items.length, "item")}, ${pluralize(new Set(preview.data.items.map((item) => item.source)).size, "store")}`}
            </p>
          )}
          {canImport && (
            <fieldset className="import-target">
              <legend>Put it in</legend>
              <label>
                <input type="radio" name="import-target" checked={target === null} onChange={() => setTarget(null)} />A
                new cart
              </label>
              {carts.map((cart) => (
                <label key={cart.id}>
                  <input
                    type="radio"
                    name="import-target"
                    checked={target === cart.id}
                    onChange={() => setTarget(cart.id)}
                  />
                  {cart.name}
                </label>
              ))}
            </fieldset>
          )}
          {importing.isError && (
            <p className="form-error" role="alert">
              Picky couldn&apos;t import that. Check it and try again.
            </p>
          )}
          <div className="cart-dialog-actions">
            <button
              type="button"
              className="primary-button"
              disabled={!canImport || importing.isPending}
              onClick={() => importing.mutate()}
            >
              {importing.isPending ? "Importing…" : "Import"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p role="status">{`Added ${result.added}, merged ${result.merged}`}</p>
          <div className="cart-dialog-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void navigate({ to: "/carts/$cartId", params: { cartId: result.cart.id } })}
            >
              Open {result.cart.name}
            </button>
          </div>
        </>
      )}
    </CartDialog>
  );
}
