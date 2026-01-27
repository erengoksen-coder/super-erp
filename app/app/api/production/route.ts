import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { calculateProductionCost, calculateProfit } from '@/lib/utils/costCalculator'

// GET: Tüm üretim emirlerini getir
export async function GET() {
  try {
    const db = getDatabase()
    const orders = db.prepare(`
      SELECT 
        po.*,
        p.name as product_name,
        p.sku,
        p.price as product_price,
        COALESCE(po.material_cost, 0) as material_cost,
        COALESCE(po.labor_cost, 0) as labor_cost,
        COALESCE(po.total_cost, 0) as total_cost,
        COALESCE(po.selling_price, 0) as selling_price,
        COALESCE(po.profit, 0) as profit,
        po.due_date,
        po.estimated_completion_date,
        po.started_at,
        po.completed_at
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      ORDER BY po.created_at DESC
    `).all()
    return NextResponse.json(orders)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni üretim emri oluştur ve stokları düş
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_number, product_id, quantity, due_date } = body

    if (!order_number || !product_id || !quantity) {
      return NextResponse.json({ error: 'order_number, product_id ve quantity gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const { generateBarcode, generateSerialNumber } = await import('@/lib/utils/barcodeGenerator')
    
    // Önce ürün bilgisini al
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Bugünkü barkod sayısını al (transaction dışında)
    const today = new Date().toISOString().split('T')[0]
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM product_serial_numbers 
      WHERE product_id = ? AND date(created_at) = date(?)
    `).get(product_id, today) as any

    const startSequence = (todayCount?.count || 0) + 1

    // Barkodları önceden oluştur (transaction dışında)
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
    
    const transaction = db.transaction(() => {
      // 1. Stok kontrolü ve maliyet hesaplama
      const bom = db.prepare(`
        SELECT 
          b.material_id,
          b.quantity_required,
          m.name as material_name,
          m.stock_amount,
          m.unit,
          COALESCE(m.purchase_price, 0) as purchase_price
        FROM bom b
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ?
      `).all(product_id)

      // Stok yeterliliğini kontrol et (fire dahil)
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + (firePercentage / 100))
        const required = quantityWithFire * quantity
        if (item.stock_amount < required) {
          throw new Error(`Stok yetersiz: ${item.material_name} (Gereken: ${required.toFixed(2)} ${item.unit} [Fire dahil], Mevcut: ${item.stock_amount} ${item.unit})`)
        }
      }

      // 2. Maliyet hesaplama (fire dahil)
      let totalMaterialCost = 0
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
        totalMaterialCost += quantityWithFire * item.purchase_price * quantity
      }
      
      const laborCostPerUnit = product.labor_cost || 0
      const totalLaborCost = laborCostPerUnit * quantity
      const totalCost = totalMaterialCost + totalLaborCost
      const sellingPrice = (product.price || 0) * quantity
      const profit = sellingPrice - totalCost

      // 3. Üretim emrini oluştur (maliyet bilgileriyle)
      const orderId = randomUUID()
      db.prepare(`
        INSERT INTO production_orders 
        (id, order_number, product_id, quantity, status, material_cost, labor_cost, total_cost, selling_price, profit, due_date)
        VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?, ?)
      `).run(
        orderId, 
        order_number, 
        product_id, 
        quantity,
        totalMaterialCost,
        totalLaborCost,
        totalCost,
        sellingPrice,
        profit,
        due_date || null
      )

      // 4. Stok hareketlerini oluştur (trigger otomatik düşüş yapacak)
      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (id, material_id, movement_type, quantity, reference_type, reference_id, notes)
        VALUES (?, ?, 'out', ?, 'production', ?, ?)
      `)

      // Fiili harcanan kayıtlarını oluştur (başlangıçta planlanan miktar)
      const insertActualConsumption = db.prepare(`
        INSERT INTO production_actual_consumption 
        (id, production_order_id, material_id, planned_quantity, actual_quantity, fire_quantity, variance, variance_percentage)
        VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL)
      `)
      
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
        const totalRequired = quantityWithFire * quantity
        const movementId = randomUUID()
        insertMovement.run(
          movementId,
          item.material_id,
          totalRequired,
          orderId,
          `Üretim emri: ${order_number} - ${item.material_name} (Fire: ${firePercentage}%)`
        )
        
        // Fiili harcanan kaydı oluştur
        const actualConsumptionId = randomUUID()
        insertActualConsumption.run(
          actualConsumptionId,
          orderId,
          item.material_id,
          totalRequired, // Planlanan miktar (fire dahil)
          null, // Fiili harcanan henüz girilmedi
          null, // Fire miktarı henüz hesaplanmadı
          null, // Varyans henüz hesaplanmadı
          null
        )
      }

      // 5. Barkodları ekle
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
            orderId,
            `Üretim emri: ${order_number}`
          )
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
              orderId,
              `Üretim emri: ${order_number}`
            )
          } else {
            throw error
          }
        }
      }

      return { orderId, order_number, barcodes_generated: quantity }
    })

    const result = transaction()
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
