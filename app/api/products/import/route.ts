import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import * as XLSX from 'xlsx'
import { fail } from '@/lib/api/response'
import { apiLogger } from '@/lib/api/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST: Excel dosyasından ürün toplu içe aktar (SKU, Ürün Adı, Satış Fiyatı, Min. Stok, İşçilik Maliyeti, Birim) */
export const POST = withAuth(async (request: NextRequest, user: { userId: string; role?: string }) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return fail('Dosya seçilmedi', { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buf, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) {
      return fail('Excel sayfası bulunamadı', { status: 400 })
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
    const db = getDatabase()

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const sku = String(row['SKU'] ?? row['sku'] ?? '').trim()
      const name = String(row['Ürün Adı'] ?? row['Ürün Adı'] ?? row['name'] ?? '').trim()
      if (!sku || !name) {
        errors.push(`Satır ${i + 2}: SKU ve Ürün Adı zorunludur`)
        continue
      }
      const price = Number(row['Satış Fiyatı'] ?? row['price'] ?? 0) || 0
      const minStock = Number(row['Min. Stok'] ?? row['min_stock_level'] ?? 5) || 0
      const laborCost = Number(row['İşçilik Maliyeti'] ?? row['labor_cost'] ?? 0) || 0
      const unit = String(row['Birim'] ?? row['unit'] ?? '').trim() || null

      const existing = db.prepare('SELECT id FROM products WHERE sku = ? AND deleted_at IS NULL').get(sku) as { id: string } | undefined
      if (existing) {
        try {
          db.prepare(`
            UPDATE products SET name = ?, price = ?, selling_price = ?, min_stock_level = ?, labor_cost = ?, unit = ?, updated_at = ?
            WHERE id = ?
          `).run(name, price, price, minStock, laborCost, unit, new Date().toISOString(), existing.id)
          updated++
        } catch (e) {
          errors.push(`Satır ${i + 2}: Güncelleme hatası - ${(e as Error).message}`)
        }
      } else {
        try {
          const id = randomUUID()
          db.prepare(`
            INSERT INTO products (id, name, sku, price, selling_price, min_stock_level, labor_cost, unit, company_id, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, name, sku, price, price, minStock, laborCost, unit, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
          created++
        } catch (e) {
          errors.push(`Satır ${i + 2}: Ekleme hatası - ${(e as Error).message}`)
        }
      }
    }

    apiLogger.info('Products import', { userId: user.userId, created, updated, errors: errors.length })
    return NextResponse.json({
      ok: true,
      created,
      updated,
      total: rows.length,
      errors: errors.slice(0, 20),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Import hatası'
    apiLogger.error('Products import failed', { error: message, userId: user?.userId })
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
