-- A share is a public, read-only link to one cart. Revoking keeps the row (revoked_at) so an old slug
-- never comes back to life; at most one live share per cart.
CREATE TABLE cart_shares (
  slug       text PRIMARY KEY,
  user_id    uuid NOT NULL,
  cart_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  FOREIGN KEY (user_id, cart_id) REFERENCES carts (user_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX cart_shares_live_cart_idx ON cart_shares (cart_id) WHERE revoked_at IS NULL;
