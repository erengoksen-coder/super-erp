import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Mamül stok girişi
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { product_id, quantity, user_id } = body

    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: '�Srün ve miktar (pozitif deşer) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Products tablosuna stock_amount kolonu ekle (eşer yoksa)
    try {
      db.exec('ALTER TABLE products ADD COLUMN stock_amount INTEGER DEFAULT 0')
    } catch {
      // Kolon zaten varsa hata vermez
    }

    // Stok girişi yap
    const product = db.prepare('SELECT * FROM active_products WHERE id = ? AND deleted_at IS NULL').get(product_id) as any
    
    if (!product) {
      return NextResponse.json({ error: '�Srün bulunamadı' }, { status: 404 })
    }

    // Her birim için otomatik barkod üret
    const { generateBarcode, generateSerialNumber } = await import('@/lib/utils/barcodeGenerator')
    
    // Bugünkü barkod sayısını al (SQLite için tarih formatı)
    const today = new Date().toISOString().split('T')[0]
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM product_serial_numbers 
      WHERE product_id = ? AND date(created_at) = date(?)
    `).get(product_id, today) as any

    const startSequence = (todayCount?.count || 0) + 1

    // Barkodları önceden oluştur
    const barcodesToInsert: Array<{ id: string; barcode: string; serial: string }> = []
    for (let i = 0; i < quantity; i++) {
      const sequence = startSequence + i
      const barcode = generateBarcode(product.sku, sequence)
      const serial = generateSerialNumber(sequence)
      barcodesToInsert.push({
        id: randomUUID(),
        barcode,
        serial,
      })
    }

    // Barkodları ekle
    const barcodes = []
    const insertBarcode = db.prepare(`
      INSERT INTO product_serial_numbers 
      (id, product_id, serial_number, barcode, status, notes)
      VALUES (?, ?, ?, ?, 'in_stock', ?)
    `)

    for (const barcodeData of barcodesToInsert) {
      try {
        insertBarcode.run(
          barcodeData.id,
          product_id,
          barcodeData.serial,
          barcodeData.barcode,
          'Mamül depo girişi'
        )

        barcodes.push({
          id: barcodeData.id,
          barcode: barcodeData.barcode,
          serial_number: barcodeData.serial,
        })
      } catch (error: any) {
        // Eşer hala çakışma olursa, UUID ekleyerek tekrar dene
        if (error.message && error.message.includes('UNIQUE')) {
          const uniqueId = randomUUID().slice(0, 8)
          const barcodeWithId = `${barcodeData.barcode}-${uniqueId}`
          const serialWithId = `${barcodeData.serial}-${uniqueId}`
          insertBarcode.run(
            barcodeData.id,
            product_id,
            serialWithId,
            barcodeWithId,
            'Mamül depo girişi'
          )
          barcodes.push({
            id: barcodeData.id,
            barcode: barcodeWithId,
            serial_number: serialWithId,
          })
        } else {
          throw error
        }
      }
    }

    const newStock = (product.stock_amount || 0) + quantity
    
    db.transaction(() => {
      // Stoku güncelle
      db.prepare('UPDATE products SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newStock, product_id)

      // Stok hareketi kaydı oluştur (product_id kullan, material_id NULL)
      const movementId = randomUUID()
      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, product_id, movement_type, quantity, reference_type, reference_id, notes, user_id, created_at)
        VALUES (?, NULL, ?, 'in', ?, 'manual', NULL, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        movementId,
        product_id,
        quantity,
        `Manuel mamül stok girişi - ${new Date().toLocaleString('tr-TR')}`,
        user_id || null
      )
    })()

    return NextResponse.json({
      success: true,
      product: { ...product, stock_amount: newStock },
      barcodes,
      message: `${quantity} adet mamül girişi yapıldı ve ${quantity} adet barkod üretildi`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

