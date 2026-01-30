-- Unified schema migration (materials-based)
-- IMPORTANT: Back up the database before running.
-- NOTE: SQLite does not support "ADD COLUMN IF NOT EXISTS".
-- This migration is intended to be run once on SQLite.

-- If 003_simple_schema is active, the legacy 002 stocks table is not used.
DROP TABLE IF EXISTS stocks;

-- Soft delete columns (if missing).
ALTER TABLE production_orders ADD COLUMN deleted_at TEXT;
ALTER TABLE orders ADD COLUMN deleted_at TEXT;
ALTER TABLE products ADD COLUMN deleted_at TEXT;

-- Audit columns (if missing).
ALTER TABLE orders ADD COLUMN created_by TEXT;
ALTER TABLE production_orders ADD COLUMN created_by TEXT;
