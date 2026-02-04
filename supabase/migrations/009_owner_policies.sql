-- Owner-based policies for tables that include created_by.
-- Keeps legacy rows readable when created_by is NULL.

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'orders',
    'production_orders',
    'stock_movements'
  ];
  tbl TEXT;
  has_created_by BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'created_by'
    ) INTO has_created_by;

    IF NOT has_created_by THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_owner_select ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_owner_write ON public.%I', tbl);

    EXECUTE format(
      'CREATE POLICY authenticated_owner_select ON public.%I FOR SELECT TO authenticated USING (created_by = auth.uid() OR created_by IS NULL)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY authenticated_owner_write ON public.%I FOR ALL TO authenticated USING (created_by = auth.uid() OR created_by IS NULL) WITH CHECK (created_by = auth.uid() OR created_by IS NULL)',
      tbl
    );
  END LOOP;
END $$;
