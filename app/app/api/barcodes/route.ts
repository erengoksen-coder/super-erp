import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { generateBarcode, generateSerialNumber } from '@/lib/utils/barcodeGenerator'

// GET: Barkodları listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const status = searchParams.get('status')
    const barcode = searchParams.get('barcode')

    const db = getDatabase()
    let query = `
      SELECT 
        psn.*,
        p.name as product_name,
        p.sku,
        po.order_number as production_order_number
      FROM product_serial_numbers psn
      JOIN products p ON psn.product_id = p.id
      LEFT JOIN production_orders po ON psn.production_order_id = po.id
      WHERE 1=1
    `
    const params: any[] = []

    if (productId) {
      query += ' AND psn.product_id = ?'
      params.push(productId)
    }

    if (status) {
      query += ' AND psn.status = ?'
      params.push(status)
    }

    if (barcode) {
      query += ' AND (psn.barcode = ? OR psn.serial_number = ?)'
      params.push(barcode, barcode)
    }

    query += ' ORDER BY psn.created_at DESC'

    const barcodes = db.prepare(query).all(...params)
    return NextResponse.json(barcodes)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni barkodlar oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, quantity, production_order_id, notes } = body

    if (!product_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'product_id ve quantity (pozitif) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Ürün bilgisini al
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

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
      (id, product_id, serial_number, barcode, production_order_id, status, notes)
      VALUES (?, ?, ?, ?, ?, 'in_stock', ?)
    `)

    for (const barcodeData of barcodesToInsert) {
      try {
        insertBarcode.run(
          barcodeData.id,
          product_id,
          barcodeData.serial,
          barcodeData.barcode,
          production_order_id || null,
          notes || null
        )

        barcodes.push({
          id: barcodeData.id,
          barcode: barcodeData.barcode,
          serial_number: barcodeData.serial,
          product_id,
          product_name: product.name,
          sku: product.sku,
        })
      } catch (error: any) {
        // Eğer hala çakışma olursa, UUID ekleyerek tekrar dene
        if (error.message && error.message.includes('UNIQUE')) {
          const uniqueId = randomUUID().slice(0, 8)
          const barcodeWithId = `${barcodeData.barcode}-${uniqueId}`
          const serialWithId = `${barcodeData.serial}-${uniqueId}`
          insertBarcode.run(
            barcodeData.id,
            product_id,
            serialWithId,
            barcodeWithId,
            production_order_id || null,
            notes || null
          )
          barcodes.push({
            id: barcodeData.id,
            barcode: barcodeWithId,
            serial_number: serialWithId,
            product_id,
            product_name: product.name,
            sku: product.sku,
          })
        } else {
          throw error
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: barcodes.length,
      barcodes,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
