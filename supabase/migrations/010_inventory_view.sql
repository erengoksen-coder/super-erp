-- Unified inventory view for realtime subscriptions
CREATE OR REPLACE VIEW inventory AS
SELECT
  id,
  name,
  code,
  NULL::varchar as sku,
  stock_amount,
  min_stock_level,
  'material'::varchar as item_type
FROM materials
UNION ALL
SELECT
  id,
  name,
  NULL::varchar as code,
  sku,
  stock_amount,
  min_stock_level,
  'product'::varchar as item_type
FROM products;
