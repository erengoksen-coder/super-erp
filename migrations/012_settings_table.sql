-- Livasofa ERP Settings Migration
-- Adds a specialized table for company-wide and system-level parameters.

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT, -- JSON string for complex objects
  category TEXT DEFAULT 'general', -- 'general', 'accounting', 'shipping', 'ui'
  company_id TEXT DEFAULT 'company_default',
  branch_id TEXT DEFAULT 'branch_default',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT -- user_id
);

-- Seed with initial default settings
INSERT OR IGNORE INTO settings (key, value, category) VALUES 
('company_info', '{"name": "Livasofa ERP Enterprise", "vkn": "1234567890", "tax_office": "GİB", "brand": "Liva"}', 'general'),
('inventory_config', '{"barcode_type": "CODE128", "auto_generate_serials": true}', 'general'),
('e_invoice_config', '{"test_mode": true, "sign_algorithm": "SHA256withRSA"}', 'accounting');
