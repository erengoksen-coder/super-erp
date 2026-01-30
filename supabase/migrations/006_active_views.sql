-- Active views for soft-deleted records
CREATE VIEW IF NOT EXISTS active_orders AS
SELECT * FROM orders WHERE deleted_at IS NULL;

CREATE VIEW IF NOT EXISTS active_products AS
SELECT * FROM products WHERE deleted_at IS NULL;
