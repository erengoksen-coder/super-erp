import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import * as XLSX from 'xlsx'
import { fail } from '@/lib/api/response'
import { apiLogger } from '@/lib/api/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** POST: Excel dosyasından cari hesap toplu içe aktar */
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
      const code = String(row['Kod'] ?? row['code'] ?? '').trim()
      const name = String(row['Ad/Ünvan'] ?? row['name'] ?? '').trim()
      if (!name) {
        errors.push(`Satır ${i + 2}: Ad/Ünvan zorunludur`)
        continue
      }
      const type = String(row['Tip'] ?? row['type'] ?? 'customer').trim() || 'customer'
      const taxNumber = String(row['Vergi No'] ?? row['tax_number'] ?? '').trim() || null
      const phone = String(row['Telefon'] ?? row['phone'] ?? '').trim() || null
      const email = String(row['E-posta'] ?? row['email'] ?? '').trim() || null
      const address = String(row['Adres'] ?? row['address'] ?? '').trim() || null
      const riskLimit = Number(row['Risk Limiti'] ?? row['risk_limit'] ?? 0) || 0
      const discountRate = Number(row['İskonto Oranı'] ?? row['discount_rate'] ?? 0) || 0

      const existing = code
        ? (db.prepare('SELECT id FROM accounts WHERE code = ? AND deleted_at IS NULL').get(code) as { id: string } | undefined)
        : undefined

      if (existing) {
        try {
          db.prepare(`
            UPDATE accounts SET name = ?, type = ?, tax_number = ?, phone = ?, email = ?, address = ?, risk_limit = ?, discount_rate = ?, updated_at = ?
            WHERE id = ?
          `).run(name, type, taxNumber, phone, email, address, riskLimit, discountRate, new Date().toISOString(), existing.id)
          updated++
        } catch (e) {
          errors.push(`Satır ${i + 2}: Güncelleme hatası - ${(e as Error).message}`)
        }
      } else {
        const finalCode = code || `MUS-${String(created + updated + 1).padStart(4, '0')}`
        const id = randomUUID()
        try {
          db.prepare(`
            INSERT INTO accounts (id, code, name, type, tax_number, phone, email, address, risk_limit, discount_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, finalCode, name, type, taxNumber, phone, email, address, riskLimit, discountRate)
          created++
        } catch (e) {
          errors.push(`Satır ${i + 2}: Ekleme hatası - ${(e as Error).message}`)
        }
      }
    }

    apiLogger.info('Accounts import', { userId: user.userId, created, updated, errors: errors.length })
    return NextResponse.json({
      ok: true,
      created,
      updated,
      total: rows.length,
      errors: errors.slice(0, 20),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Import hatası'
    apiLogger.error('Accounts import failed', { error: message, userId: user?.userId })
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
