import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { accountsRepo } from '@/lib/repositories/accounts'

/** Türkçe karakterleri normalize ederek cari ismiyle eşleştirir (ÖZKARDEŞLER = OZKARDESLER vb.) */
function findAccountByNormalizedName(db: ReturnType<typeof getDatabase>, name: string): { id: string } | undefined {
  const n = (s: string) =>
    (s || '')
      .trim()
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
  const needle = n(name)
  if (!needle) return undefined
  const rows = db.prepare('SELECT id, name FROM accounts WHERE deleted_at IS NULL').all() as { id: string; name: string }[]
  const found = rows.find((r) => n(r.name) === needle)
  return found ? { id: found.id } : undefined
}

// Siparişlerdeki bayi/cari isminden cari hesap oluştur (yoksa). Sadece deleted_at IS NULL olanları "mevcut" sayar.
function createAccountIfNotExists(
  db: ReturnType<typeof getDatabase>,
  dealerName: string | null
): { created: boolean; accountId: string | null; errorMessage?: string } {
  if (!dealerName || dealerName.trim() === '') {
    return { created: false, accountId: null }
  }
  const trimmedName = dealerName.trim()
  const normalizedName = trimmedName.toLowerCase()

  try {
    // Kayıtlı carileri tekrar ekleme: tam eşleşme veya Türkçe normalize eşleşme varsa atla
    const existingByExact = db.prepare(
      `SELECT id FROM accounts 
       WHERE (deleted_at IS NULL OR deleted_at = '') 
       AND (TRIM(name) = ? OR LOWER(TRIM(name)) = ?)`
    ).get(trimmedName, normalizedName) as { id: string } | undefined
    if (existingByExact) return { created: false, accountId: existingByExact.id }

    const existingByNormalized = findAccountByNormalizedName(db, trimmedName)
    if (existingByNormalized) return { created: false, accountId: existingByNormalized.id }
  } catch (e: any) {
    return { created: false, accountId: null, errorMessage: e?.message || 'Mevcut cari kontrolü başarısız' }
  }

  const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
  let rows: Array<{ code: string }> = []
  try {
    rows = db.prepare(`SELECT code FROM accounts WHERE type = 'customer' AND code LIKE 'MUS-%'`).all() as Array<{ code: string }>
  } catch (e: any) {
    return { created: false, accountId: null, errorMessage: e?.message || 'Kod listesi alınamadı' }
  }
  const numbers = rows.map((r) => parseInt(r.code.replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n))
  const codeNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  const code = `MUS-${String(codeNumber).padStart(4, '0')}`

  let lastError = ''
  try {
    accountsRepo.insert({ id, code, name: trimmedName, type: 'customer' })
    return { created: true, accountId: id }
  } catch (e1: any) {
    lastError = e1?.message || String(e1)
    try {
      db.prepare(`INSERT INTO accounts (id, code, name, type) VALUES (?, ?, ?, ?)`).run(id, code, trimmedName, 'customer')
      return { created: true, accountId: id }
    } catch (e2: any) {
      lastError = e2?.message || String(e2)
      try {
        db.prepare(`
          INSERT INTO accounts (id, code, name, type, tax_number, phone, email, address, risk_limit, discount_rate, authorized_person_name, authorized_person_phone, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, code, trimmedName, 'customer', null, null, null, null, null, null, null, null, null, null)
        return { created: true, accountId: id }
      } catch (e3: any) {
        lastError = e3?.message || String(e3)
        try {
          db.prepare(`
            INSERT INTO accounts (id, code, name, type, balance, company_id, branch_id, created_at, updated_at, deleted_at, created_by, updated_by)
            VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'), datetime('now'), NULL, NULL, NULL)
          `).run(id, code, trimmedName, 'customer', DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
          return { created: true, accountId: id }
        } catch (e4: any) {
          lastError = e4?.message || String(e4)
          console.warn(`Cari hesap oluşturulamadı (${trimmedName}):`, lastError)
          return { created: false, accountId: null, errorMessage: lastError }
        }
      }
    }
  }
}

// POST: Mevcut siparişlerden cari hesaplar oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    let orders: Array<{ dealer_name: string }> = []
    try {
      orders = db.prepare(`
        SELECT DISTINCT dealer_name FROM active_orders
        WHERE dealer_name IS NOT NULL AND dealer_name != ''
        ORDER BY dealer_name
      `).all() as Array<{ dealer_name: string }>
    } catch (e1: any) {
      try {
        orders = db.prepare(`
          SELECT DISTINCT dealer_name FROM orders
          WHERE dealer_name IS NOT NULL AND dealer_name != '' AND (deleted_at IS NULL OR deleted_at = '')
          ORDER BY dealer_name
        `).all() as Array<{ dealer_name: string }>
      } catch (e2: any) {
        console.error('Sipariş listesi alınamadı:', e1?.message, e2?.message)
        return NextResponse.json({
          error: 'Sipariş listesi alınamadı',
          details: e2?.message || e1?.message || 'orders veya active_orders sorgusu başarısız'
        }, { status: 500 })
      }
    }

    const results = {
      total_dealers: orders.length,
      created: 0,
      existing: 0,
      errors: 0,
      first_error: null as string | null,
      details: [] as Array<{ name: string; status: string }>,
    }

    for (const order of orders) {
      try {
        const result = createAccountIfNotExists(db, order.dealer_name)
        if (result.created) {
          results.created++
          results.details.push({ name: order.dealer_name, status: 'Oluşturuldu' })
        } else if (result.accountId) {
          results.existing++
          results.details.push({ name: order.dealer_name, status: 'Zaten mevcut' })
        } else {
          results.errors++
          const status = result.errorMessage ? `Hata: ${result.errorMessage}` : 'Hata'
          results.details.push({ name: order.dealer_name, status })
          if (!results.first_error && result.errorMessage) results.first_error = result.errorMessage
        }
      } catch (e: any) {
        results.errors++
        const msg = e?.message || 'bilinmeyen'
        results.details.push({ name: order.dealer_name, status: `Hata: ${msg}` })
        if (!results.first_error) results.first_error = msg
      }
    }

    const message =
      results.errors > 0 && results.first_error
        ? `${results.created} yeni cari oluşturuldu, ${results.existing} zaten mevcuttu. ${results.errors} hata (örnek: ${results.first_error})`
        : `${results.created} yeni cari hesap oluşturuldu, ${results.existing} cari hesap zaten mevcuttu${results.errors > 0 ? `, ${results.errors} hata` : ''}`

    return NextResponse.json({
      success: true,
      message,
      ...results,
    })
  } catch (error: any) {
    console.error('Cari hesaplar oluşturulurken hata:', error)
    return NextResponse.json(
      {
        error: 'Cari hesaplar oluşturulamadı',
        details: error?.message || String(error),
      },
      { status: 500 }
    )
  }
})
