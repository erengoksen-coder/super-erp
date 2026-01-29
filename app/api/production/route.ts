import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { randomUUID } from 'crypto'
import { calculateProductionCost, calculateProfit } from '@/lib/utils/costCalculator'
import { logAudit } from '@/lib/audit'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { getAuthUserId } from '@/lib/auth/session'

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

// GET: Tüm üretim emirlerini getir
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()
    const { searchParams } = new URL(request.url)
    const customerName = searchParams.get('customer_name') // Müşteri ismi arama filtresi
    const search = searchParams.get('search') || searchParams.get('q') // Cari/ürün araması
    
    // Önce production_orders tablosunun var olup olmadığını kontrol et
    try {
      const testQuery = db.prepare('SELECT COUNT(*) as count FROM production_orders').get() as any
      console.log('Production orders count:', testQuery?.count || 0)
    } catch (testError: any) {
      console.error('Production orders table check failed:', testError.message)
      return NextResponse.json({ error: `Veritabanı hatası: ${testError.message}` }, { status: 500 })
    }
    
    let query = `
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
        po.completed_at,
        o.dealer_name,
        o.customer_name,
        o.order_number as customer_order_number,
        o.order_date,
        o.configuration,
        o.notes
      FROM production_orders po
      LEFT JOIN products p ON po.product_id = p.id
      LEFT JOIN orders o ON po.id = o.production_order_id
      WHERE 1=1
    `
    const params: any[] = []
    query += ' AND po.company_id = ? AND po.branch_id = ?'
    params.push(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
    query += ' AND po.deleted_at IS NULL'
    
    // Müşteri ismi arama filtresi
    if (customerName && customerName.trim()) {
      query += ' AND o.customer_name LIKE ?'
      params.push(`%${customerName.trim()}%`)
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`
      query += `
        AND (
          o.customer_name LIKE ?
          OR o.dealer_name LIKE ?
          OR p.name LIKE ?
          OR p.sku LIKE ?
          OR po.order_number LIKE ?
          OR o.order_number LIKE ?
        )
      `
      params.push(term, term, term, term, term, term)
    }
    
    query += ' ORDER BY po.created_at DESC'
    
    const orders = db.prepare(query).all(...params)
    
    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('Error in GET /api/production:', error)
    return NextResponse.json({ 
      error: error.message || 'Üretim emirleri yüklenirken bir hata oluştu',
      details: error.stack 
    }, { status: 500 })
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
    
    const actorId = await getActorId(request)
    const transaction = db.transaction(() => {
      // 1. Stok kontrolü ve maliyet hesaplama
      const bom = db.prepare(`
        SELECT 
          b.material_id,
          b.quantity_required,
          b.unit as unit,
          COALESCE(b.fire_percentage, 0) as fire_percentage,
          m.name as material_name,
          m.stock_amount,
          m.unit as material_unit,
          m.reserved_quantity,
          COALESCE(m.purchase_price, 0) as purchase_price
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.deleted_at IS NULL
      `).all(product_id)

      // Stok yeterliliğini kontrol et (fire dahil)
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + (firePercentage / 100))
        const fromUnit = (item.unit || item.material_unit || '').toString()
        const toUnit = (item.material_unit || '').toString()
        const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
        const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
        const required = convertedQuantity * quantity
        const available = (item.stock_amount || 0) - (item.reserved_quantity || 0)
        if (available < required) {
          throw new Error(`Stok yetersiz: ${item.material_name} (Gereken: ${required.toFixed(2)} ${item.material_unit} [Fire dahil], Mevcut: ${item.stock_amount} ${item.material_unit})`)
        }
      }

      // 2. Maliyet hesaplama (fire dahil)
      let totalMaterialCost = 0
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
        const fromUnit = (item.unit || item.material_unit || '').toString()
        const toUnit = (item.material_unit || '').toString()
        const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
        const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
        totalMaterialCost += convertedQuantity * item.purchase_price * quantity
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
        (id, order_number, product_id, quantity, status, material_cost, labor_cost, total_cost, selling_price, profit, due_date, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId, 
        order_number, 
        product_id, 
        quantity,
        'in_progress', // status
        totalMaterialCost,
        totalLaborCost,
        totalCost,
        sellingPrice,
        profit,
        due_date || null,
        DEFAULT_COMPANY_ID,
        DEFAULT_BRANCH_ID
      )

      db.prepare(`
        INSERT INTO production_costs
        (id, production_order_id, material_cost, labor_cost, overhead_cost, total_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        orderId,
        totalMaterialCost,
        totalLaborCost,
        0,
        totalCost
      )

      logAudit(db, {
        tableName: 'production_orders',
        action: 'create',
        recordId: orderId,
        userId: actorId,
        after: {
          id: orderId,
          order_number,
          product_id,
          quantity,
          status: 'in_progress',
        },
      })

      // 4. Stok hareketlerini oluştur ve stokları düş
      const insertMovement = db.prepare(`
        INSERT INTO stock_movements (id, material_id, movement_type, quantity, reference_type, reference_id, notes, company_id, branch_id, warehouse_id, from_warehouse_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      // Stok güncelleme sorgusu

      // Fiili harcanan kayıtlarını oluştur (başlangıçta planlanan miktar)
      const insertActualConsumption = db.prepare(`
        INSERT INTO production_actual_consumption 
        (id, production_order_id, material_id, planned_quantity, actual_quantity, fire_quantity, variance, variance_percentage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
        const fromUnit = (item.unit || item.material_unit || '').toString()
        const toUnit = (item.material_unit || '').toString()
        const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
        const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
        const totalRequired = convertedQuantity * quantity
        
        // Stoku düş (ÖNEMLİ: movement_type 'out' olduğu için stok düşmeli)
        applyMaterialStockChange(db, item.material_id, -totalRequired)
        
        const movementId = randomUUID()
        insertMovement.run(
          movementId,
          item.material_id,
          'out', // movement_type
          totalRequired, // quantity
          'production_order', // reference_type
          orderId, // reference_id
          `Üretim emri: ${order_number} - ${item.material_name} (Fire: ${firePercentage}%)`, // notes
          DEFAULT_COMPANY_ID,
          DEFAULT_BRANCH_ID,
          DEFAULT_WAREHOUSE_ID,
          DEFAULT_WAREHOUSE_ID
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
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      for (const barcodeData of barcodesToInsert) {
        try {
          insertBarcode.run(
            barcodeData.id,
            product_id,
            barcodeData.serial,
            barcodeData.barcode,
            orderId,
            'in_stock', // status
            `Üretim emri: ${order_number}` // notes
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
              'in_stock', // status
              `Üretim emri: ${order_number}` // notes
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
