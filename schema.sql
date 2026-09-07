CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  emoji TEXT,
  note TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  dojo_payment_intent_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  items TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_date,status);
CREATE INDEX IF NOT EXISTS idx_orders_dojo_payment ON orders(dojo_payment_intent_id);
INSERT OR IGNORE INTO products VALUES ('fruit-box','Fruit & Veg Box','Boxes',28,'🥕','Seasonal selection',20,1);
INSERT OR IGNORE INTO products VALUES ('salad','Organic Salad','Salads',4.5,'🥬','Fresh & crisp',30,1);
INSERT OR IGNORE INTO products VALUES ('juice','Organic Juice','Juices',4,'🧃','Cold pressed',24,1);
INSERT OR IGNORE INTO products VALUES ('honey','Local Honey','Honey',7.5,'🍯','Trusted local producer',18,1);
INSERT OR IGNORE INTO products VALUES ('eggs','Organic Eggs','Eggs',4.5,'🥚','Free-range',30,1);
INSERT OR IGNORE INTO products VALUES ('jam','Organic Jam','Preserves',5.5,'🍓','Small-batch',20,1);
INSERT OR IGNORE INTO products VALUES ('carrots','Fresh Carrots','Vegetables',2.5,'🥕','Seasonal',40,1);
INSERT OR IGNORE INTO products VALUES ('tomatoes','Vine Tomatoes','Vegetables',3.5,'🍅','Ripe & juicy',40,1);
