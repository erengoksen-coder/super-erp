-- RLS policy for production_orders and audit trigger

DO $$
DECLARE
  has_created_by BOOLEAN;
BEGIN
  -- Ensure RLS enabled if table exists
  IF to_regclass('public.production_orders') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY';
  END IF;

  -- Create policy only if created_by column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'production_orders'
      AND column_name = 'created_by'
  ) INTO has_created_by;

  IF has_created_by THEN
    EXECUTE 'DROP POLICY IF EXISTS production_orders_owner_select ON public.production_orders';
    EXECUTE $policy$
      CREATE POLICY production_orders_owner_select
      ON public.production_orders
      FOR SELECT
      TO authenticated
      USING (auth.uid()::text = created_by OR created_by IS NULL)
    $policy$;
  END IF;
END $$;

-- Audit function
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, created_at)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), NULL, auth.uid(), NOW());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, created_at)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), NOW());
    RETURN NEW;
  ELSE
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, created_at)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, NULL, to_jsonb(NEW), auth.uid(), NOW());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach audit trigger to production_orders
DO $$
BEGIN
  IF to_regclass('public.production_orders') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS audit_production_orders ON public.production_orders';
    EXECUTE 'CREATE TRIGGER audit_production_orders
      AFTER INSERT OR UPDATE OR DELETE ON public.production_orders
      FOR EACH ROW EXECUTE FUNCTION log_audit()';
  END IF;
END $$;
