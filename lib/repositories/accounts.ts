import { getDatabase } from '@/lib/database/db'

export type AccountRow = {
  id: string
  code: string
  name: string
  type: string
  risk_limit?: number | null
  created_by?: string | null
  updated_by?: string | null
  created_by_name?: string | null
  created_by_username?: string | null
  updated_by_name?: string | null
  updated_by_username?: string | null
}

export type AccountInsert = {
  id: string
  code: string
  name: string
  type: string
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  risk_limit?: number | null
  created_by?: string | null
}

export type AccountUpdate = {
  name: string
  type: string | null
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  risk_limit?: number | null
  updated_by?: string | null
}

export type CountRow = {
  count: number | null
}

export const accountsRepo = {
  getAll(type?: string | null): AccountRow[] {
    const db = getDatabase()
    let query = `
      SELECT 
        a.*,
        creator.full_name as created_by_name,
        creator.username as created_by_username,
        updater.full_name as updated_by_name,
        updater.username as updated_by_username
      FROM accounts a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users updater ON a.updated_by = updater.id
    `
    const params: string[] = []
    if (type) {
      query += ' WHERE a.deleted_at IS NULL AND a.type = ?'
      params.push(type)
    } else {
      query += ' WHERE a.deleted_at IS NULL'
    }
    query += ' ORDER BY a.code ASC'
    return db.prepare(query).all(...params) as AccountRow[]
  },

  getById(id: string): AccountRow | undefined {
    const db = getDatabase()
    return db.prepare(`
      SELECT 
        a.*,
        creator.full_name as created_by_name,
        creator.username as created_by_username,
        updater.full_name as updated_by_name,
        updater.username as updated_by_username
      FROM accounts a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users updater ON a.updated_by = updater.id
      WHERE a.id = ? AND a.deleted_at IS NULL
    `).get(id) as AccountRow | undefined
  },

  getLastCode(type: string): string | null {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT code FROM accounts 
      WHERE type = ? AND deleted_at IS NULL
      ORDER BY code DESC 
      LIMIT 1
    `).get(type) as { code: string } | undefined
    return row?.code || null
  },

  insert(account: AccountInsert) {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO accounts (id, code, name, type, tax_number, phone, email, address, risk_limit, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      account.id,
      account.code,
      account.name,
      account.type,
      account.tax_number || null,
      account.phone || null,
      account.email || null,
      account.address || null,
      account.risk_limit ?? null,
      account.created_by || null,
      account.created_by || null
    )
    return { id: account.id, code: account.code }
  },

  update(id: string, update: AccountUpdate) {
    const db = getDatabase()
    db.prepare(`
      UPDATE accounts 
      SET name = ?, type = ?, tax_number = ?, phone = ?, email = ?, address = ?, risk_limit = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      update.name,
      update.type,
      update.tax_number || null,
      update.phone || null,
      update.email || null,
      update.address || null,
      update.risk_limit ?? null,
      update.updated_by || null,
      id
    )
  },

  delete(id: string) {
    const db = getDatabase()
    db.prepare('UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL')
      .run(id)
  },

  getUsageCounts(id: string, name: string) {
    const db = getDatabase()
    const usedInMaterials = db
      .prepare('SELECT COUNT(*) as count FROM materials WHERE supplier_id = ?')
      .get(id) as CountRow | undefined
    const usedInOrders = db
      .prepare('SELECT COUNT(*) as count FROM active_orders WHERE customer_code = ? OR dealer_name = ?')
      .get(id, name) as CountRow | undefined
    return {
      usedInMaterials: usedInMaterials?.count || 0,
      usedInOrders: usedInOrders?.count || 0,
    }
  },
}
