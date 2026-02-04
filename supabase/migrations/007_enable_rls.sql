-- Enable RLS and add baseline policies for authenticated users.
-- Adjust policies to your data model before production use.

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'audit_logs',
    'bom',
    'hr_departments',
    'hr_employees',
    'hr_teams',
    'hr_workplaces',
    'invoices',
    'inventory',
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
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_all ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY authenticated_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      table_name
    );
  END LOOP;
END $$;
