BEGIN;

-- 1) stocks tablosunu geri getir
CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 2) Guvenli soft delete kolonu ekleme (SQLite uyumlu)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'production_orders'
      AND column_name = 'deleted_at'
  ) THEN
    RETURN;
  END IF;

  CREATE TABLE production_orders_new AS
  SELECT *, NULL::TIMESTAMPTZ as deleted_at FROM production_orders;

  DROP TABLE production_orders;
  ALTER TABLE production_orders_new RENAME TO production_orders;
END $$;

-- 3) Audit kolonlari guvenli ekleme
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'created_by'
  ) THEN
    RETURN;
  END IF;

  CREATE TABLE orders_new AS
  SELECT *, NULL::TEXT as created_by, NULL::TIMESTAMPTZ as deleted_at FROM orders;

  DROP TABLE orders;
  ALTER TABLE orders_new RENAME TO orders;
END $$;

COMMIT;
