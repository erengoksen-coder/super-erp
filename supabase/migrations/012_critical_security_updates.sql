-- Critical fixes: recreate stocks table, enforce policy, update audit trigger function.

-- 1) Restore stocks table
CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 0,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) RLS policy for production_orders (owner access)
DO $$
DECLARE
  has_created_by BOOLEAN;
BEGIN
  IF to_regclass('public.production_orders') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'production_orders'
      AND column_name = 'created_by'
  ) INTO has_created_by;

  IF has_created_by THEN
    EXECUTE 'DROP POLICY IF EXISTS "User access" ON public.production_orders';
    EXECUTE 'CREATE POLICY "User access" ON public.production_orders
      FOR ALL USING (auth.uid()::text = created_by)';
  END IF;
END $$;

-- 3) Audit function (requested signature)
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs(table_name, record_id, action, user_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, auth.uid(), to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs(table_name, record_id, action, user_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO audit_logs(table_name, record_id, action, user_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, auth.uid(), NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
