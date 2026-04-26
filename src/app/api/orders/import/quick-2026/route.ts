import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const EXCEL_PATH = 'C:/Users/livas/OneDrive/Masaüstü/2026 YURT İÇİ  Planlama.xlsx'
    
    if (!fs.existsSync(EXCEL_PATH)) {
      return NextResponse.json({ 
        error: 'Dosya bulunamadı', 
        details: 'Masaüstünde 2026 YURT İÇİ Planlama.xlsx dosyası tespit edilemedi.' 
      }, { status: 404 })
    }

    const buffer = fs.readFileSync(EXCEL_PATH)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(sheet, { raw: true })

    const db = getDatabase()
    let count = 0

    // Helper to normalize dates from Excel
    const excelDateToISO = (serial: any) => {
      if (typeof serial !== 'number') return null
      const excelEpoch = new Date(1899, 11, 30)
      const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000)
      return date.toISOString().split('T')[0]
    }

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, order_number, dealer_name, customer_name,
        product_name, product_id, product_sku, quantity, order_date, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    const findProduct = db.prepare('SELECT id, sku FROM products WHERE name LIKE ? COLLATE NOCASE LIMIT 1')

    db.transaction(() => {
      for (const row of data as any[]) {
        const orderDate = excelDateToISO(row['SİP TRH'])
        const dealer = row['CARİ ADI'] || 'Yurt İçi Planlama'
        const customer = row['MÜŞTERİ ADI'] || ''
        const productInput = row['ÜRÜN ADI'] || 'Bilinmeyen Ürün'
        const qty = parseFloat(row['SİP MİKTAR']) || 1
        
        const productMatch = findProduct.get(`%${productInput}%`) as any
        const productId = productMatch ? productMatch.id : null
        const productSku = productMatch ? productMatch.sku : null

        let notes = row['AÇIKLAMA'] && row['AÇIKLAMA'] !== 'YOK' ? row['AÇIKLAMA'] : ''
        if (row['KUMAŞ KODU']) notes += (notes ? ' | ' : '') + `Kumaş: ${row['KUMAŞ KODU']}`
        if (row['KASA'] && row['KASA'] !== 'KATALOG') notes += (notes ? ' | ' : '') + `Kasa: ${row['KASA']}`
        if (row['AYAK'] && row['AYAK'] !== 'KATALOG') notes += (notes ? ' | ' : '') + `Ayak: ${row['AYAK']}`
        if (row['PARCA']) notes += (notes ? ' | ' : '') + `Parça: ${row['PARCA']}`
        
        const takipNo = row['TAKİP\r\nNO'] || row['TAKİP NO']
        if (takipNo) notes += (notes ? ' | ' : '') + `Takip No: ${takipNo}`

        const orderNumber = `SIP-2026-${String(takipNo || count).padStart(4, '0')}-${randomUUID().substring(0, 4)}`

        insertOrder.run(
          randomUUID(),
          orderNumber,
          dealer,
          customer,
          productInput,
          productId,
          productSku,
          qty,
          orderDate,
          notes,
          'pending'
        )
        count++
      }
    })()

    return NextResponse.json({ 
      message: `${count} sipariş başarıyla aktarıldı`,
      inserted_count: count
    })
  } catch (err: any) {
    console.error('[quick-import] Error:', err)
    return NextResponse.json({ error: 'Sistem hatası', details: err.message }, { status: 500 })
  }
}
