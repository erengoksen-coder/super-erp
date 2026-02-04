-- Baseline RLS policies: authenticated users can read, service_role can write.
-- Adjust per-table policies for production requirements.

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'audit_logs',
    'bom',
    'hr_departments',
    'hr_employees',
    'hr_teams',
    'hr_workplaces',
    'inventory',
    'invoices',
    'materials',
    'orders',
    'products',
    'production_orders',
    'purchase_orders',
    'purchase_requests',
    'shipments',
    'stock_movements',
    'stocks',
    'users'
  ];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass('public.' || table_name) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS authenticated_all ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS service_role_full ON public.%I', table_name);

    IF table_name <> 'audit_logs' THEN
      EXECUTE format(
        'CREATE POLICY authenticated_read ON public.%I FOR SELECT TO authenticated USING (true)',
        table_name
      );
    END IF;

    EXECUTE format(
      'CREATE POLICY service_role_full ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      table_name
    );
  END LOOP;
END $$;
