-- Active views for soft-deleted records
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW active_orders AS
      SELECT * FROM orders WHERE deleted_at IS NULL';
  END IF;

  IF to_regclass('public.products') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW active_products AS
      SELECT * FROM products WHERE deleted_at IS NULL';
  END IF;
END $$;
