import {
  formatMoney,
  nameStorefrontsApart,
  pluralize,
  sourceLabel,
  sumByCurrency,
  type Money,
  type SharedCartItem,
} from "@picky/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { isProductSource } from "@picky/catalog/sites";
import { useEffect, useRef } from "react";
import { currentUserQuery } from "../api/auth-queries.ts";
import { ApiRequestError } from "../api/json-requester.ts";
import { SIGN_IN_PATH } from "../auth/route-guards.ts";
import { AppBar, BrandLink, PublicNav } from "../components/app-bar.tsx";
import { ExternalLinkIcon } from "../components/icons.tsx";
import { currencyTotalLabel } from "../format/currency-total-label.ts";
import { usePageTitle } from "../hooks/use-page-title.ts";

const sharedCartRouteApi = getRouteApi("/c/$slug");

/** A shared link may name a store this version of Picky does not know; show its id as the API sent it. */
function storeLabel(source: string): string {
  return isProductSource(source) ? sourceLabel(source) : source;
}

interface StoreLines {
  source: string;
  label: string;
  items: SharedCartItem[];
}

/** Items grouped by store, stores in the order they first appear. */
export function groupByStore(items: readonly SharedCartItem[]): StoreLines[] {
  const groups = new Map<string, StoreLines>();
  for (const item of items) {
    const group = groups.get(item.source) ?? { source: item.source, label: storeLabel(item.source), items: [] };
    group.items.push(item);
    groups.set(item.source, group);
  }
  return nameStorefrontsApart([...groups.values()]);
}

function totalsOf(items: readonly SharedCartItem[]): Money[] {
  const lines = items.flatMap((item) =>
    item.price === null ? [] : [{ amount: item.price.amount * item.quantity, currency: item.price.currency }],
  );
  return sumByCurrency(lines);
}

/** Asks search engines not to list a private link while the page is mounted. */
function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/** /c/$slug: a cart someone shared, view only. Works signed out. */
export function SharedCartPage() {
  const { slug } = sharedCartRouteApi.useParams();
  const { save } = sharedCartRouteApi.useSearch();
  const { cartSharingClient, authClient } = sharedCartRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  useNoIndex();
  const shared = useQuery({
    queryKey: ["shared-carts", slug],
    queryFn: () => cartSharingClient.readShared(slug),
    retry: false,
  });
  const { data: user } = useQuery(currentUserQuery(authClient));
  const copy = useMutation({
    mutationFn: () => cartSharingClient.importCart({ slug }),
    onSuccess: async ({ cart }) => {
      await queryClient.invalidateQueries({ queryKey: ["carts"] });
      await navigate({ to: "/carts/$cartId", params: { cartId: cart.id } });
    },
  });
  const signedIn = user !== null && user !== undefined;
  const saveCopy = () => {
    if (signedIn) copy.mutate();
    else void navigate({ to: SIGN_IN_PATH, search: { redirect: `/c/${encodeURIComponent(slug)}?save=1` } });
  };
  const resumed = useRef(false);
  useEffect(() => {
    if (save === true && signedIn && shared.data !== undefined && !resumed.current) {
      resumed.current = true;
      copy.mutate();
    }
  }, [save, signedIn, shared.data, copy]);
  usePageTitle(shared.data?.name ?? "Shared cart");

  return (
    <>
      <AppBar>
        <BrandLink />
        <PublicNav />
      </AppBar>
      <main className="page narrow shared-cart">
        {shared.isPending && <p className="subtle">Loading the cart…</p>}
        {shared.isError && (
          <NoLongerShared notFound={shared.error instanceof ApiRequestError && shared.error.status === 404} />
        )}
        {shared.data !== undefined && (
          <>
            <div className="page-head-text">
              <span className="chip shared-mark">Shared cart · view only</span>
              <h1 className="page-title">{shared.data.name}</h1>
              <p className="subtle">{pluralize(shared.data.items.length, "item")}</p>
            </div>
            {groupByStore(shared.data.items).map((group) => (
              <StoreSection key={group.source} group={group} />
            ))}
            <Totals items={shared.data.items} />
            <div className="shared-actions">
              <a className="soft-button" href="#open-in-stores">
                Open in stores
              </a>
              <button type="button" className="primary-button" disabled={copy.isPending} onClick={saveCopy}>
                {copy.isPending ? "Saving…" : "Save a copy to my Picky"}
              </button>
            </div>
            {copy.isError && (
              <p className="form-error" role="alert">
                Picky couldn&apos;t save a copy. Try again.
              </p>
            )}
            <OpenInStores items={shared.data.items} />
          </>
        )}
      </main>
    </>
  );
}

function NoLongerShared({ notFound }: { notFound: boolean }) {
  return (
    <section className="card error-panel" role="alert">
      <h1 className="page-title">{notFound ? "This cart is no longer shared." : "Picky couldn't load this cart."}</h1>
      <p className="subtle">
        {notFound
          ? "The person who sent it stopped sharing. Ask them for a new link."
          : "Check your connection, then try again."}
      </p>
    </section>
  );
}

function StoreSection({ group }: { group: StoreLines }) {
  return (
    <section className="card cart-store-card" aria-label={group.label}>
      <h2 className="cart-store-name">{group.label}</h2>
      <ul className="shared-items">
        {group.items.map((item) => (
          <li key={`${item.source}:${item.externalId}`} className="shared-item">
            {item.image !== null && <img className="shared-item-image" src={item.image} alt="" loading="lazy" />}
            <div className="shared-item-text">
              <span className="shared-item-title">{item.title}</span>
              {item.variant !== null && <span className="hint">{item.variant}</span>}
              <span className="hint">
                {`Quantity ${item.quantity} · ${item.price === null ? "Price not listed" : formatMoney(item.price)}`}
                {item.availability !== null && ` · ${item.availability}`}
              </span>
              <a href={item.url} target="_blank" rel="noreferrer" className="shared-item-link">
                View on {storeLabel(item.source)} <ExternalLinkIcon size={14} />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Totals({ items }: { items: readonly SharedCartItem[] }) {
  const totals = totalsOf(items);
  return (
    <section className="card cart-totals-card" aria-label="Totals">
      {totals.map((total) => (
        <p key={total.currency} className="cart-total-line">
          <span>{currencyTotalLabel(total.currency, pricedLineCount(items, total.currency))}</span>
          <strong>{formatMoney(total)}</strong>
        </p>
      ))}
      {totals.length === 0 && <p className="subtle">No prices listed</p>}
      <p className="hint">Before delivery and tax. Prices may have changed.</p>
    </section>
  );
}

/** Lines priced in `currency`: the lines that make up that total. */
function pricedLineCount(items: readonly SharedCartItem[], currency: string): number {
  return items.filter((item) => item.price?.currency === currency).length;
}

function OpenInStores({ items }: { items: readonly SharedCartItem[] }) {
  return (
    <section id="open-in-stores" className="card cart-store-card" aria-label="Open in stores">
      <h2 className="cart-store-name">Open in stores</h2>
      <ul className="plain-links">
        {items.map((item) => (
          <li key={`${item.source}:${item.externalId}`}>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.title}
            </a>
            <span className="hint">{` · ${storeLabel(item.source)}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
