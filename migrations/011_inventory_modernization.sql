-- Livasofa ERP Inventory Modernization Migration
-- Adds advanced tracking for stock movements and serial numbers.

-- 1. Stock Movements (Stok Hareketleri)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
  quantity REAL NOT NULL,
  reference_type TEXT, -- 'purchase_order', 'sales_order', 'manual', 'shipment'
  reference_id TEXT,
  warehouse_id TEXT DEFAULT 'wh_main',
  notes TEXT,
  company_id TEXT DEFAULT 'company_default',
  branch_id TEXT DEFAULT 'branch_default',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT, -- user_id
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 2. Inventory Serials (Seri No / Barkod Takibi)
CREATE TABLE IF NOT EXISTS inventory_serials (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  serial_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available', -- 'available', 'sold', 'reserved', 'damaged'
  last_movement_id TEXT,
  company_id TEXT DEFAULT 'company_default',
  branch_id TEXT DEFAULT 'branch_default',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (last_movement_id) REFERENCES inventory_movements(id)
);

-- 3. Product Barcode Field (if missing)
-- Note: Better-sqlite3 doesn't support ALTER TABLE ... ADD COLUMN IF NOT EXISTS easily
-- So we'll try to add it in the runner with a generic statement.

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inv_move_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_move_ref ON inventory_movements(reference_id);
CREATE INDEX IF NOT EXISTS idx_inv_serial_num ON inventory_serials(serial_number);
