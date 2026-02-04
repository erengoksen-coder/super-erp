-- Unified schema migration (materials-based)
-- IMPORTANT: Back up the database before running.
-- NOTE: SQLite does not support "ADD COLUMN IF NOT EXISTS".
-- This migration is intended to be run once on SQLite.

-- If 003_simple_schema is active, the legacy 002 stocks table is not used.
DROP TABLE IF EXISTS stocks;
-- Compatibility view for legacy queries expecting "stocks".
CREATE VIEW IF NOT EXISTS stocks AS
SELECT
  id,
  NULL as code,
  name,
  NULL as category,
  unit,
  stock_amount as current_quantity,
  min_stock_level as min_quantity,
  NULL as unit_cost,
  1 as is_active,
  created_at,
  updated_at,
  NULL as deleted_at
FROM materials;

-- Soft delete columns (SQLite-safe: rebuild tables).
CREATE TABLE IF NOT EXISTS production_orders_new AS
SELECT *, NULL as deleted_at FROM production_orders;
DROP TABLE production_orders;
ALTER TABLE production_orders_new RENAME TO production_orders;

CREATE TABLE IF NOT EXISTS orders_new AS
SELECT *, NULL as deleted_at FROM orders;
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;

CREATE TABLE IF NOT EXISTS products_new AS
SELECT *, NULL as deleted_at FROM products;
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;

-- Audit columns (if missing).
ALTER TABLE orders ADD COLUMN created_by TEXT;
ALTER TABLE production_orders ADD COLUMN created_by TEXT;
