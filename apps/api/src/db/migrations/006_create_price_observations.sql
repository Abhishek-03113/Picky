-- Price history: one row per observed change of a product's price or availability, appended when the
-- shopper's browser saves a snapshot. Rows follow the product (and its owner) when either is deleted.
CREATE TABLE price_observations (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid NOT NULL,
  product_id   uuid NOT NULL,
  amount       numeric NOT NULL,
  currency     text NOT NULL,
  list_amount  numeric,
  availability text,
  observed_at  timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, product_id) REFERENCES products (user_id, id) ON DELETE CASCADE
);

CREATE INDEX price_observations_product_observed_idx ON price_observations (product_id, observed_at DESC);
