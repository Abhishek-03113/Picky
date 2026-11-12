import type { SQL } from "bun";
import type {
  CartItem,
  CartItemInput,
  CatalogCartDetail,
  CatalogCartSummary,
  Money,
  SharedCartItem,
  SharedCartView,
} from "@picky/catalog";
import { isUuid } from "../db/uuid.ts";
import { fromStoredSnapshot, type StoredSnapshot } from "../products/stored-snapshot.ts";
import {
  DEFAULT_CART_NAME,
  type CartMergeLine,
  type CartMergeResult,
  type CartRepository,
  type SharedCartLine,
} from "./cart-repository.ts";
import { generateShareSlug, normalizeShareSlug } from "./share-slug.ts";

interface SummaryRow {
  id: string;
  name: string;
  updated_at: Date;
  items: { productId: string; quantity: number }[];
  share_slug: string | null;
}

interface ItemRow {
  id: string;
  snapshot: StoredSnapshot;
  created_at: Date;
  updated_at: Date;
  quantity: number;
  note: string | null;
  price_when_added: Money | null;
  added_at: Date;
}

interface SharedRow {
  slug: string;
  user_id: string;
  cart_id: string;
  name: string;
  updated_at: Date;
}

interface SharedLineRow {
  snapshot: StoredSnapshot;
  quantity: number;
}

// A random 80-bit slug colliding is not expected; the retries only keep a freak collision from failing.
const SLUG_ATTEMPTS = 3;

// jsonb_agg (not array_agg): Bun decodes jsonb to a JS array, but returns uuid[] as raw text.
const SUMMARY_COLUMNS = (sql: SQL) => sql`
  c.id, c.name, c.updated_at,
  COALESCE(jsonb_agg(jsonb_build_object('productId', ci.product_id::text, 'quantity', ci.quantity)
                     ORDER BY ci.position, ci.added_at)
           FILTER (WHERE ci.product_id IS NOT NULL), '[]'::jsonb) AS items,
  (SELECT s.slug FROM cart_shares s WHERE s.cart_id = c.id AND s.revoked_at IS NULL) AS share_slug`;

/**
 * CartRepository on Postgres via Bun's built-in SQL client.
 *
 * @example await new PostgresCartRepository(sql).putItem(userId, cartId, productId, { quantity: 2 })
 */
export class PostgresCartRepository implements CartRepository {
  constructor(private readonly sql: SQL) {}

  async listCarts(userId: string): Promise<CatalogCartSummary[]> {
    const carts = await this.selectSummaries(userId);
    if (carts.length > 0) return carts;
    await this.createDefaultCart(userId);
    return this.selectSummaries(userId);
  }

  async createCart(userId: string, name: string): Promise<CatalogCartSummary> {
    const [row]: { id: string }[] = await this.sql`
      INSERT INTO carts (user_id, name) VALUES (${userId}, ${name}) RETURNING id`;
    const id = row?.id ?? "";
    return requireSummary(await this.findSummary(userId, id), id);
  }

  async findCart(userId: string, id: string): Promise<CatalogCartDetail | null> {
    const summary = await this.findSummary(userId, id);
    if (summary === null) return null;
    const rows: ItemRow[] = await this.sql`
      SELECT p.id, p.snapshot, p.created_at, p.updated_at, ci.quantity, ci.note, ci.price_when_added, ci.added_at
      FROM cart_items ci JOIN products p ON p.user_id = ci.user_id AND p.id = ci.product_id
      WHERE ci.user_id = ${userId} AND ci.cart_id = ${id} ORDER BY ci.position, ci.added_at`;
    return {
      id: summary.id,
      name: summary.name,
      items: rows.map(toCartItem),
      shareSlug: summary.shareSlug,
      updatedAt: summary.updatedAt,
    };
  }

  async renameCart(userId: string, id: string, name: string): Promise<CatalogCartSummary | null> {
    if (!isUuid(id)) return null;
    await this.sql`UPDATE carts SET name = ${name}, updated_at = now() WHERE user_id = ${userId} AND id = ${id}`;
    return this.findSummary(userId, id);
  }

  async deleteCart(userId: string, id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const rows: { id: string }[] = await this.sql`
      DELETE FROM carts WHERE user_id = ${userId} AND id = ${id} RETURNING id`;
    return rows.length > 0;
  }

  async putItem(
    userId: string,
    id: string,
    productId: string,
    input: CartItemInput,
  ): Promise<CatalogCartSummary | null> {
    if (!isUuid(id) || !isUuid(productId)) return null;
    const written = await this.sql.begin(async (tx) => {
      if (!(await lockCart(tx, userId, id))) return false;
      // Selecting from products (not VALUES) makes another user's or a missing product insert nothing.
      const rows: { product_id: string }[] = await tx`
        INSERT INTO cart_items (user_id, cart_id, product_id, quantity, note, price_when_added, position)
        SELECT ${userId}, ${id}, p.id, ${input.quantity ?? 1}, ${input.note ?? null},
               NULLIF(p.snapshot->'price', 'null'::jsonb),
               (SELECT COALESCE(MAX(position) + 1, 0) FROM cart_items WHERE cart_id = ${id})
        FROM products p WHERE p.user_id = ${userId} AND p.id = ${productId}
        ON CONFLICT (cart_id, product_id) DO UPDATE SET
          quantity = COALESCE(${input.quantity ?? null}::integer, cart_items.quantity),
          note = CASE WHEN ${input.note !== undefined}::boolean THEN EXCLUDED.note ELSE cart_items.note END
        RETURNING product_id`;
      if (rows.length === 0) return false;
      await tx`UPDATE carts SET updated_at = now() WHERE id = ${id}`;
      return true;
    });
    return written ? this.findSummary(userId, id) : null;
  }

  async removeItem(userId: string, id: string, productId: string): Promise<CatalogCartSummary | null> {
    if (!isUuid(id) || !isUuid(productId)) return null;
    // user_id in the WHERE: a guessed cart id of another user deletes and touches nothing.
    await this.sql`DELETE FROM cart_items WHERE user_id = ${userId} AND cart_id = ${id} AND product_id = ${productId}`;
    await this.sql`UPDATE carts SET updated_at = now() WHERE user_id = ${userId} AND id = ${id}`;
    return this.findSummary(userId, id);
  }

  async mergeItems(userId: string, id: string, lines: readonly CartMergeLine[]): Promise<CartMergeResult | null> {
    if (!isUuid(id)) return null;
    const counts = await this.sql.begin(async (tx) => {
      if (!(await lockCart(tx, userId, id))) return null;
      const tally = { added: 0, merged: 0 };
      for (const line of lines) {
        const inserted = await mergeLine(tx, userId, id, line);
        if (inserted === true) tally.added += 1;
        if (inserted === false) tally.merged += 1;
      }
      await tx`UPDATE carts SET updated_at = now() WHERE id = ${id}`;
      return tally;
    });
    if (counts === null) return null;
    return { cart: requireSummary(await this.findSummary(userId, id), id), ...counts };
  }

  async createShare(userId: string, id: string): Promise<string | null> {
    if (!isUuid(id)) return null;
    return this.sql.begin(async (tx) => {
      if (!(await lockCart(tx, userId, id))) return null;
      const [live]: { slug: string }[] = await tx`
        SELECT slug FROM cart_shares WHERE cart_id = ${id} AND revoked_at IS NULL`;
      if (live !== undefined) return live.slug;
      return insertShare(tx, userId, id);
    });
  }

  async revokeShare(userId: string, id: string): Promise<boolean> {
    if ((await this.findSummary(userId, id)) === null) return false;
    await this.sql`
      UPDATE cart_shares SET revoked_at = now()
      WHERE user_id = ${userId} AND cart_id = ${id} AND revoked_at IS NULL`;
    return true;
  }

  async findSharedCart(slug: string): Promise<SharedCartView | null> {
    const shared = await this.findLiveShare(slug);
    if (shared === null) return null;
    const rows = await this.selectSharedLines(shared);
    return {
      slug: shared.slug,
      name: shared.name,
      items: rows.map(toSharedItem),
      updatedAt: shared.updated_at.toISOString(),
    };
  }

  async findSharedCartLines(slug: string): Promise<{ name: string; lines: SharedCartLine[] } | null> {
    const shared = await this.findLiveShare(slug);
    if (shared === null) return null;
    const rows = await this.selectSharedLines(shared);
    const lines = rows.map((row) => ({ snapshot: fromStoredSnapshot(row.snapshot), quantity: row.quantity }));
    return { name: shared.name, lines };
  }

  private async selectSummaries(userId: string): Promise<CatalogCartSummary[]> {
    const rows: SummaryRow[] = await this.sql`
      SELECT ${SUMMARY_COLUMNS(this.sql)} FROM carts c
      LEFT JOIN cart_items ci ON ci.cart_id = c.id
      WHERE c.user_id = ${userId}
      GROUP BY c.id ORDER BY c.updated_at DESC, c.created_at DESC`;
    return rows.map(toSummary);
  }

  // Locks the user's row so two first visits at once (web app and extension) create one cart, not two.
  private async createDefaultCart(userId: string): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      await tx`
        INSERT INTO carts (user_id, name) SELECT ${userId}, ${DEFAULT_CART_NAME}
        WHERE NOT EXISTS (SELECT 1 FROM carts WHERE user_id = ${userId})`;
    });
  }

  private async findSummary(userId: string, id: string): Promise<CatalogCartSummary | null> {
    if (!isUuid(id)) return null;
    const rows: SummaryRow[] = await this.sql`
      SELECT ${SUMMARY_COLUMNS(this.sql)} FROM carts c
      LEFT JOIN cart_items ci ON ci.cart_id = c.id
      WHERE c.user_id = ${userId} AND c.id = ${id} GROUP BY c.id`;
    return rows[0] === undefined ? null : toSummary(rows[0]);
  }

  private async findLiveShare(candidate: string): Promise<SharedRow | null> {
    const slug = normalizeShareSlug(candidate);
    if (slug === null) return null;
    const rows: SharedRow[] = await this.sql`
      SELECT s.slug, s.user_id, s.cart_id, c.name, c.updated_at FROM cart_shares s
      JOIN carts c ON c.user_id = s.user_id AND c.id = s.cart_id
      WHERE s.slug = ${slug} AND s.revoked_at IS NULL`;
    return rows[0] ?? null;
  }

  private async selectSharedLines(shared: SharedRow): Promise<SharedLineRow[]> {
    return this.sql`
      SELECT p.snapshot, ci.quantity
      FROM cart_items ci JOIN products p ON p.user_id = ci.user_id AND p.id = ci.product_id
      WHERE ci.user_id = ${shared.user_id} AND ci.cart_id = ${shared.cart_id} ORDER BY ci.position, ci.added_at`;
  }
}

async function lockCart(tx: SQL, userId: string, id: string): Promise<boolean> {
  const rows: { id: string }[] = await tx`SELECT id FROM carts WHERE user_id = ${userId} AND id = ${id} FOR UPDATE`;
  return rows.length > 0;
}

/** True when the line was added, false when it merged into one already there, null when the product is unknown. */
async function mergeLine(tx: SQL, userId: string, id: string, line: CartMergeLine): Promise<boolean | null> {
  if (!isUuid(line.productId)) return null;
  // xmax = 0 only on a freshly inserted row, so it tells an insert from an ON CONFLICT update.
  const rows: { inserted: boolean }[] = await tx`
    INSERT INTO cart_items (user_id, cart_id, product_id, quantity, note, price_when_added, position)
    SELECT ${userId}, ${id}, p.id, ${line.quantity}, ${line.note},
           NULLIF(p.snapshot->'price', 'null'::jsonb),
           (SELECT COALESCE(MAX(position) + 1, 0) FROM cart_items WHERE cart_id = ${id})
    FROM products p WHERE p.user_id = ${userId} AND p.id = ${line.productId}
    ON CONFLICT (cart_id, product_id) DO UPDATE SET
      quantity = GREATEST(cart_items.quantity, EXCLUDED.quantity),
      note = COALESCE(cart_items.note, EXCLUDED.note)
    RETURNING (xmax = 0) AS inserted`;
  return rows[0]?.inserted ?? null;
}

async function insertShare(tx: SQL, userId: string, id: string): Promise<string> {
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
    const rows: { slug: string }[] = await tx`
      INSERT INTO cart_shares (slug, user_id, cart_id) VALUES (${generateShareSlug()}, ${userId}, ${id})
      ON CONFLICT (slug) DO NOTHING RETURNING slug`;
    if (rows[0] !== undefined) return rows[0].slug;
  }
  throw new Error(`Could not create a unique share slug for cart ${id} in ${SLUG_ATTEMPTS} attempts`);
}

function requireSummary(summary: CatalogCartSummary | null, id: string): CatalogCartSummary {
  if (summary !== null) return summary;
  throw new Error(`Cart ${id} vanished right after it was written; expected one row`);
}

function toSummary(row: SummaryRow): CatalogCartSummary {
  return {
    id: row.id,
    name: row.name,
    items: row.items,
    shareSlug: row.share_slug,
    updatedAt: row.updated_at.toISOString(),
  };
}

function toCartItem(row: ItemRow): CartItem {
  return {
    product: {
      id: row.id,
      snapshot: fromStoredSnapshot(row.snapshot),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    },
    quantity: row.quantity,
    note: row.note,
    priceWhenAdded: row.price_when_added,
    addedAt: row.added_at.toISOString(),
  };
}

// Only listing facts: the owner's notes, ids and account never reach a stranger with the link.
function toSharedItem(row: SharedLineRow): SharedCartItem {
  const snapshot = fromStoredSnapshot(row.snapshot);
  return {
    source: snapshot.source,
    externalId: snapshot.externalId,
    title: snapshot.title,
    url: snapshot.url,
    image: snapshot.images[0] ?? null,
    price: snapshot.price,
    availability: snapshot.availability,
    variant: snapshot.variant ?? null,
    quantity: row.quantity,
  };
}
