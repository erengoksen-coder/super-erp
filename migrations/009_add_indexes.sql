-- Livasofa ERP Performance Optimization Migration
-- Adds critical indexes to improve JOIN and WHERE performance across the system.

-- 1. Accounts (Cari Hesaplar)
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);

-- 2. Sales Orders (Satış Siparişleri - assuming table is 'sales_orders')
-- Note: schema check showed sales_order_items, so parent is likely sales_orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_account ON sales_orders(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date);

-- 3. Sales Order Items
CREATE INDEX IF NOT EXISTS idx_so_items_order ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_so_items_product ON sales_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_so_items_status ON sales_order_items(status);

-- 4. Products (Ürünler)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- 5. Production Orders (Üretim Emirleri)
CREATE INDEX IF NOT EXISTS idx_prod_orders_so ON production_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_status ON production_orders(status);

-- 6. Production Steps
CREATE INDEX IF NOT EXISTS idx_prod_steps_order ON production_order_steps(production_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_steps_status ON production_order_steps(status);

-- 7. Inventory Movements (assuming movements table)
CREATE INDEX IF NOT EXISTS idx_inv_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_material ON inventory_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_date ON inventory_movements(created_at);

-- 8. Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
