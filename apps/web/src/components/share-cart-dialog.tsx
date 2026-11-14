import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { CartDialog } from "./cart-dialog.tsx";

const rootRouteApi = getRouteApi("__root__");

interface ShareCartDialogProps {
  cartId: string;
  /** The live share slug, or null when the cart is not shared yet. */
  shareSlug: string | null;
  onClose: () => void;
}

/** Link for a share slug on this site. */
export function shareLink(origin: string, slug: string): string {
  return `${origin}/c/${slug}`;
}

/**
 * Turns sharing on for a cart and shows the link and the code to send; "Stop sharing" turns the link off.
 *
 * @example <ShareCartDialog cartId={cart.id} shareSlug={cart.shareSlug} onClose={close} />
 */
export function ShareCartDialog({ cartId, shareSlug, onClose }: ShareCartDialogProps) {
  const { cartSharingClient } = rootRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState(shareSlug);
  const refreshCarts = () => queryClient.invalidateQueries({ queryKey: ["carts"] });
  const turnOn = useMutation({
    mutationFn: () => cartSharingClient.share(cartId),
    onSuccess: async (newSlug) => {
      setSlug(newSlug);
      await refreshCarts();
    },
  });
  const turnOff = useMutation({
    mutationFn: () => cartSharingClient.unshare(cartId),
    onSuccess: async () => {
      setSlug(null);
      await refreshCarts();
    },
  });
  return (
    <CartDialog title="Share this cart" onClose={onClose}>
      {slug === null ? (
        <>
          <p className="subtle">
            Anyone with the link can see this cart, without signing in. They cannot change it, and you can stop sharing
            at any time.
          </p>
          <WhatTheySee />
          {(turnOn.isError || turnOff.isError) && (
            <p className="form-error" role="alert">
              Picky couldn&apos;t change sharing. Try again.
            </p>
          )}
          <div className="cart-dialog-actions">
            <button
              type="button"
              className="primary-button"
              disabled={turnOn.isPending}
              onClick={() => turnOn.mutate()}
            >
              {turnOn.isPending ? "Turning on…" : "Turn on sharing"}
            </button>
          </div>
        </>
      ) : (
        <>
          <CopyField label="Link" value={shareLink(window.location.origin, slug)} copyLabel="Copy link" />
          <CopyField label="Code" value={slug} copyLabel="Copy code" code />
          <WhatTheySee />
          {turnOff.isError && (
            <p className="form-error" role="alert">
              Picky couldn&apos;t stop sharing. Try again.
            </p>
          )}
          <div className="cart-dialog-actions">
            <button
              type="button"
              className="soft-button danger"
              disabled={turnOff.isPending}
              onClick={() => turnOff.mutate()}
            >
              Stop sharing
            </button>
          </div>
        </>
      )}
    </CartDialog>
  );
}

function WhatTheySee() {
  return (
    <section className="share-sees" aria-label="What they see">
      <h3>What they see</h3>
      <ul>
        <li>The cart&apos;s name and its items, with prices and links to each store.</li>
        <li>Later changes to the cart, because the link always shows its latest version.</li>
        <li>Never your email, your notes or your other carts.</li>
      </ul>
    </section>
  );
}

interface CopyFieldProps {
  label: string;
  value: string;
  copyLabel: string;
  code?: boolean;
}

function CopyField({ label, value, copyLabel, code = false }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="copy-field">
      <span className="copy-field-label">{label}</span>
      <div className="copy-field-row">
        {code ? (
          <code className="copy-field-value">{value}</code>
        ) : (
          <input readOnly value={value} aria-label={label} onFocus={(event) => event.target.select()} />
        )}
        <button type="button" className="pill-button" onClick={() => void copy()}>
          {copied ? "Copied" : copyLabel}
        </button>
      </div>
    </div>
  );
}
