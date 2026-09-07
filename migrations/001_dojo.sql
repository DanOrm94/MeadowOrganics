-- Run this once against an existing Meadow Organics D1 database.
ALTER TABLE orders ADD COLUMN dojo_payment_intent_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_dojo_payment ON orders(dojo_payment_intent_id);
