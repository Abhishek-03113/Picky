import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useRef } from "react";
import { MenuPopover } from "./menu-popover.tsx";

const rootRouteApi = getRouteApi("__root__");

/** Saves a JSON value as a file through a temporary link. */
function downloadJson(value: object, fileName: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Menu to take the cart (CSV or a Picky file) or the whole library out of Picky, and to restore a backup.
 *
 * @example <ExportMenu cartId={cart.id} />
 */
export function ExportMenu({ cartId }: { cartId: string }) {
  const { cartSharingClient } = rootRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const download = useMutation({
    mutationFn: () => cartSharingClient.backup(),
    onSuccess: (backup) => downloadJson(backup, "picky-backup.json"),
  });
  const restore = useMutation({
    mutationFn: async (file: File) => cartSharingClient.restore(JSON.parse(await file.text()) as object),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const result = restore.data;
  return (
    <>
      <MenuPopover label="Export" triggerClassName="soft-button" trigger="Export">
        {(close) => (
          <>
            <a
              className="menu-item"
              role="menuitem"
              href={cartSharingClient.exportUrl(cartId, "csv")}
              download
              onClick={close}
            >
              This cart as CSV
            </a>
            <a
              className="menu-item"
              role="menuitem"
              href={cartSharingClient.exportUrl(cartId, "json")}
              download
              onClick={close}
            >
              This cart as a Picky file
            </a>
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                download.mutate();
                close();
              }}
            >
              Download backup
            </button>
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                fileInput.current?.click();
                close();
              }}
            >
              Restore from a file
            </button>
          </>
        )}
      </MenuPopover>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Backup file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) restore.mutate(file);
          event.target.value = "";
        }}
      />
      {result !== undefined && (
        <p className="hint" role="status">
          {`Restored ${result.products} products, ${result.comparisons} comparisons and ${result.carts} carts. ${result.skipped} skipped.`}
        </p>
      )}
      {(restore.isError || download.isError) && (
        <p className="form-error" role="alert">
          {restore.isError ? "Picky couldn't restore that file." : "Picky couldn't make a backup. Try again."}
        </p>
      )}
    </>
  );
}
