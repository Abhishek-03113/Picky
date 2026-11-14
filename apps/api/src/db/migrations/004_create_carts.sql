-- A cart is a named list of the user's products with how many of each they mean to buy. Like
-- comparisons, every row names its user, and the composite FKs keep a cart to its owner's products.
CREATE TABLE carts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, id)
);

CREATE INDEX carts_user_updated_at_idx ON carts (user_id, updated_at DESC);

-- price_when_added is the product's snapshot price at add time (Money as jsonb), for "cheaper than when
-- you added it". position keeps the user's order; deleting the cart or the product removes the line.
CREATE TABLE cart_items (
  user_id          uuid NOT NULL,
  cart_id          uuid NOT NULL,
  product_id       uuid NOT NULL,
  quantity         integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),
  note             text,
  price_when_added jsonb,
  position         integer NOT NULL,
  added_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, product_id),
  FOREIGN KEY (user_id, cart_id) REFERENCES carts (user_id, id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, product_id) REFERENCES products (user_id, id) ON DELETE CASCADE
);

-- Answers "which carts is this product in?" without scanning every line.
CREATE INDEX cart_items_product_idx ON cart_items (product_id);
