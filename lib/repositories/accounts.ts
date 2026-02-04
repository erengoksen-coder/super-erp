import { getDatabase } from '@/lib/database/db'

export type AccountRow = {
  id: string
  code: string
  name: string
  type: string
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  balance?: number | null
  risk_limit?: number | null
  discount_rate?: number | null
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
  created_at?: string | null
  updated_at?: string | null
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
  discount_rate?: number | null
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
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
  discount_rate?: number | null
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
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
    
    // Tüm gerekli kolonların varlığını kontrol et ve yoksa ekle
    const requiredColumns = [
      { name: 'discount_rate', type: 'REAL DEFAULT 0' },
      { name: 'authorized_person_name', type: 'TEXT' },
      { name: 'authorized_person_phone', type: 'TEXT' }
    ]
    
    for (const col of requiredColumns) {
      try {
        // Kolonun varlığını kontrol et
        db.prepare(`SELECT ${col.name} FROM accounts LIMIT 1`).get()
      } catch (e: any) {
        if (e.message?.includes(`no such column: ${col.name}`)) {
          try {
            db.exec(`ALTER TABLE accounts ADD COLUMN ${col.name} ${col.type}`)
          } catch (alterError: any) {
            // Kolon zaten varsa veya başka bir hata varsa
            if (!alterError.message?.includes('duplicate column') && !alterError.message?.includes('already exists')) {
              // Sessizce devam et, çünkü kolon zaten eklenmiş olabilir
            }
          }
        }
      }
    }
    
    try {
      db.prepare(`
        INSERT INTO accounts (id, code, name, type, tax_number, phone, email, address, risk_limit, discount_rate, authorized_person_name, authorized_person_phone, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        account.discount_rate ?? null,
        account.authorized_person_name || null,
        account.authorized_person_phone || null,
        account.created_by || null,
        account.created_by || null
      )
      return { id: account.id, code: account.code }
    } catch (error: any) {
      // Hata mesajını Türkçe'ye çevir
      let errorMessage = error.message || 'Bilinmeyen hata'
      if (errorMessage.includes('no such column')) {
        // Kolon eksikse tekrar eklemeyi dene
        const missingColumn = errorMessage.match(/no such column: (\w+)/)?.[1]
        if (missingColumn) {
          try {
            if (missingColumn === 'discount_rate') {
              db.exec('ALTER TABLE accounts ADD COLUMN discount_rate REAL DEFAULT 0')
            } else if (missingColumn === 'authorized_person_name') {
              db.exec('ALTER TABLE accounts ADD COLUMN authorized_person_name TEXT')
            } else if (missingColumn === 'authorized_person_phone') {
              db.exec('ALTER TABLE accounts ADD COLUMN authorized_person_phone TEXT')
            }
            // Tekrar dene
            return this.insert(account)
          } catch (retryError: any) {
            errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen sunucuyu yeniden başlatın.'
          }
        } else {
          errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen sunucuyu yeniden başlatın.'
        }
      } else if (errorMessage.includes('UNIQUE constraint')) {
        errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
      } else if (errorMessage.includes('FOREIGN KEY')) {
        errorMessage = 'İlişkili kayıt bulunamadı.'
      } else if (errorMessage.includes('NOT NULL')) {
        errorMessage = 'Zorunlu alanlar eksik.'
      }
      throw new Error(errorMessage)
    }
  },

  update(id: string, update: AccountUpdate) {
    const db = getDatabase()
    
    // Tüm gerekli kolonların varlığını kontrol et ve yoksa ekle
    const requiredColumns = [
      { name: 'discount_rate', type: 'REAL DEFAULT 0' },
      { name: 'authorized_person_name', type: 'TEXT' },
      { name: 'authorized_person_phone', type: 'TEXT' }
    ]
    
    for (const col of requiredColumns) {
      try {
        // Kolonun varlığını kontrol et
        db.prepare(`SELECT ${col.name} FROM accounts LIMIT 1`).get()
      } catch (e: any) {
        if (e.message?.includes(`no such column: ${col.name}`)) {
          try {
            db.exec(`ALTER TABLE accounts ADD COLUMN ${col.name} ${col.type}`)
          } catch (alterError: any) {
            // Kolon zaten varsa veya başka bir hata varsa
            if (!alterError.message?.includes('duplicate column') && !alterError.message?.includes('already exists')) {
              // Sessizce devam et, çünkü kolon zaten eklenmiş olabilir
            }
          }
        }
      }
    }
    
    try {
      db.prepare(`
        UPDATE accounts 
        SET name = ?, type = ?, tax_number = ?, phone = ?, email = ?, address = ?, risk_limit = ?, discount_rate = ?, authorized_person_name = ?, authorized_person_phone = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
      `).run(
        update.name,
        update.type,
        update.tax_number || null,
        update.phone || null,
        update.email || null,
        update.address || null,
        update.risk_limit ?? null,
        update.discount_rate ?? null,
        update.authorized_person_name || null,
        update.authorized_person_phone || null,
        update.updated_by || null,
        id
      )
    } catch (error: any) {
      // Hata mesajını Türkçe'ye çevir
      let errorMessage = error.message || 'Bilinmeyen hata'
      if (errorMessage.includes('no such column')) {
        // Kolon eksikse tekrar eklemeyi dene
        const missingColumn = errorMessage.match(/no such column: (\w+)/)?.[1]
        if (missingColumn) {
          try {
            if (missingColumn === 'discount_rate') {
              db.exec('ALTER TABLE accounts ADD COLUMN discount_rate REAL DEFAULT 0')
            } else if (missingColumn === 'authorized_person_name') {
              db.exec('ALTER TABLE accounts ADD COLUMN authorized_person_name TEXT')
            } else if (missingColumn === 'authorized_person_phone') {
              db.exec('ALTER TABLE accounts ADD COLUMN authorized_person_phone TEXT')
            }
            // Tekrar dene
            return this.update(id, update)
          } catch (retryError: any) {
            errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen sunucuyu yeniden başlatın.'
          }
        } else {
          errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen sunucuyu yeniden başlatın.'
        }
      } else if (errorMessage.includes('UNIQUE constraint')) {
        errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
      } else if (errorMessage.includes('FOREIGN KEY')) {
        errorMessage = 'İlişkili kayıt bulunamadı.'
      } else if (errorMessage.includes('NOT NULL')) {
        errorMessage = 'Zorunlu alanlar eksik.'
      }
      throw new Error(errorMessage)
    }
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
