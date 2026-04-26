-- Livasofa ERP CRM Module Migration
-- Adds tables for Lead and Opportunity tracking in a sales pipeline.

-- 1. CRM Leads (Potansiyel Müşteriler)
CREATE TABLE IF NOT EXISTS crm_leads (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT, -- 'web', 'ads', 'referral', 'manual'
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'not_interested', 'converted'
  score INTEGER DEFAULT 0,
  notes TEXT,
  assigned_to TEXT, -- user_id
  company_id TEXT DEFAULT 'company_default',
  branch_id TEXT DEFAULT 'branch_default',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

-- 2. CRM Opportunities (Fırsatlar)
CREATE TABLE IF NOT EXISTS crm_opportunities (
  id TEXT PRIMARY KEY,
  lead_id TEXT, -- optional
  account_id TEXT, -- link to existing customer
  title TEXT NOT NULL,
  description TEXT,
  value REAL DEFAULT 0,
  stage TEXT DEFAULT 'qualification', -- 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  probability INTEGER DEFAULT 10,
  expected_close_date TEXT,
  assigned_to TEXT, -- user_id
  company_id TEXT DEFAULT 'company_default',
  branch_id TEXT DEFAULT 'branch_default',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (lead_id) REFERENCES crm_leads(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- 3. CRM Activities
CREATE TABLE IF NOT EXISTS crm_activities (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT,
  type TEXT, -- 'call', 'email', 'meeting', 'task'
  subject TEXT,
  content TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES crm_opportunities(id)
);

-- Indexes for performance (Phase 2 optimization standard)
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_opp_stage ON crm_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_crm_opp_assigned ON crm_opportunities(assigned_to);
