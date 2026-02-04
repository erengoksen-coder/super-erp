-- RLS policies for core tables (guarded by existence checks).

DO $$
DECLARE
  has_created_by BOOLEAN;
BEGIN
  -- production_orders
  IF to_regclass('public.production_orders') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own production orders" ON public.production_orders';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own production orders" ON public.production_orders';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own production orders" ON public.production_orders';
    EXECUTE 'DROP POLICY IF EXISTS "Users can soft delete own production orders" ON public.production_orders';

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ''public'' AND table_name = ''production_orders'' AND column_name = ''created_by''
    ) INTO has_created_by;

    IF has_created_by THEN
      EXECUTE $policy$
        CREATE POLICY "Users can view own production orders"
        ON public.production_orders
        FOR SELECT
        USING (created_by = auth.uid()::text OR created_by IS NULL)
      $policy$;

      EXECUTE $policy$
        CREATE POLICY "Users can insert own production orders"
        ON public.production_orders
        FOR INSERT
        WITH CHECK (auth.uid()::text = created_by)
      $policy$;

      EXECUTE $policy$
        CREATE POLICY "Users can update own production orders"
        ON public.production_orders
        FOR UPDATE
        USING (auth.uid()::text = created_by)
        WITH CHECK (auth.uid()::text = created_by)
      $policy$;

      EXECUTE $policy$
        CREATE POLICY "Users can soft delete own production orders"
        ON public.production_orders
        FOR UPDATE
        USING (auth.uid()::text = created_by)
        WITH CHECK (auth.uid()::text = created_by)
      $policy$;
    END IF;
  END IF;

  -- orders
  IF to_regclass('public.orders') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own orders" ON public.orders';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own orders" ON public.orders';

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = ''public'' AND table_name = ''orders'' AND column_name = ''created_by''
    ) INTO has_created_by;

    IF has_created_by THEN
      EXECUTE $policy$
        CREATE POLICY "Users can view own orders"
        ON public.orders
        FOR SELECT
        USING (created_by = auth.uid()::text OR created_by IS NULL)
      $policy$;

      EXECUTE $policy$
        CREATE POLICY "Users can insert own orders"
        ON public.orders
        FOR INSERT
        WITH CHECK (auth.uid()::text = created_by)
      $policy$;

      EXECUTE $policy$
        CREATE POLICY "Users can update own orders"
        ON public.orders
        FOR UPDATE
        USING (auth.uid()::text = created_by)
        WITH CHECK (auth.uid()::text = created_by)
      $policy$;
    END IF;
  END IF;

  -- products
  IF to_regclass('public.products') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.products ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view all products" ON public.products';
    EXECUTE $policy$
      CREATE POLICY "Users can view all products"
      ON public.products
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL OR deleted_at IS NULL)
    $policy$;
  END IF;

  -- materials
  IF to_regclass('public.materials') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view all materials" ON public.materials';
    EXECUTE $policy$
      CREATE POLICY "Users can view all materials"
      ON public.materials
      FOR SELECT
      TO authenticated
      USING (deleted_at IS NULL OR deleted_at IS NULL)
    $policy$;
  END IF;

  -- bom
  IF to_regclass('public.bom') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.bom ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view BOM" ON public.bom';
    EXECUTE $policy$
      CREATE POLICY "Users can view BOM"
      ON public.bom
      FOR SELECT
      TO authenticated
      USING (true)
    $policy$;
  END IF;

  -- audit_logs
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs';
    EXECUTE 'DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs';

    EXECUTE $policy$
      CREATE POLICY "Users can view own audit logs"
      ON public.audit_logs
      FOR SELECT
      USING (user_id = auth.uid()::text)
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "System can insert audit logs"
      ON public.audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true)
    $policy$;
  END IF;
END $$;

-- View for active production orders (if table exists)
DO $$
BEGIN
  IF to_regclass('public.production_orders') IS NOT NULL THEN
    EXECUTE 'CREATE OR REPLACE VIEW active_production_orders AS
      SELECT * FROM production_orders WHERE deleted_at IS NULL';
    EXECUTE 'GRANT SELECT ON active_production_orders TO authenticated';
  END IF;
END $$;
