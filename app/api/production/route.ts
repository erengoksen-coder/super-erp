import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth, withAuthAndPermission } from '@/lib/api/withAuth'
import { DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { randomUUID } from 'crypto'
import { calculateProductionCost, calculateProfit } from '@/lib/utils/costCalculator'
import { logAudit } from '@/lib/audit'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { getAuthUserId } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'
import { getProductionOrders } from '@/lib/production/getProductionOrders'

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

// GET: Tüm üretim emirlerini getir
export const GET = withAuthAndPermission(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerName = searchParams.get('customer_name') // Müşteri ismi arama filtresi
    const search = searchParams.get('search') || searchParams.get('q') // Cari/ürün araması
    
    // Önce production_orders tablosunun var olup olmadığını kontrol et
    try {
      const db = getDatabase()
      const testQuery = db.prepare('SELECT COUNT(*) as count FROM production_orders').get() as any
      console.log('Production orders count:', testQuery?.count || 0)
    } catch (testError: any) {
      console.error('Production orders table check failed:', testError.message)
      return NextResponse.json({ error: `Veritabanı hatası: ${testError.message}` }, { status: 500 })
    }
    
    const userId = await getActorId(request)
    const orders = await getProductionOrders({ customerName, search, userId })
    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('Error in GET /api/production:', error)
    try {
      await logger.error('[Production API] GET failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch {}
    return NextResponse.json({ 
      error: error.message || 'Üretim emirleri yüklenirken bir hata oluştu',
      details: error.stack 
    }, { status: 500 })
  }
}, '/production', 'view')

// POST: Yeni üretim emri oluştur ve stokları düş
export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: any
    try {
      body = await parseJsonBody(request)
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Geçersiz istek verisi' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Geçersiz istek verisi' },
        { status: 400 }
      )
    }

    const { order_number, product_id, quantity, due_date } = body

    if (!order_number || !product_id || !quantity) {
      return NextResponse.json({ error: 'order_number, product_id ve quantity gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const { generateBarcode, generateSerialNumber } = await import('@/lib/utils/barcodeGenerator')
    
    // Önce ürün bilgisini al
    const product = db.prepare('SELECT * FROM active_products WHERE id = ?').get(product_id) as any
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const findBomProductIdByName = (name: string, excludeId: string) => {
      if (!name) return null
      
      // Ürün adından SKU kısmını çıkar (örn: "PRD-127652 - ATLAS ÜÇLÜ" -> "ATLAS ÜÇLÜ")
      const extractProductName = (fullName: string): string => {
        // " - " ile ayrılmış kısımları kontrol et
        if (fullName.includes(' - ')) {
          const parts = fullName.split(' - ')
          // Son kısmı al (genellikle ürün adı)
          return parts[parts.length - 1].trim()
        }
        // SKU formatını kontrol et (PRD-XXXXX ile başlayan)
        const skuMatch = fullName.match(/^PRD-\d+\s*-\s*(.+)$/i)
        if (skuMatch) {
          return skuMatch[1].trim()
        }
        return fullName.trim()
      }
      
      const productNameOnly = extractProductName(name)
      
      // Önce tam eşleşme dene
      let row = db.prepare(`
        SELECT p.id as id
        FROM active_products p
        JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        WHERE p.name = ? AND p.id != ?
        GROUP BY p.id
        ORDER BY COUNT(b.id) DESC
        LIMIT 1
      `).get(name, excludeId) as { id: string } | undefined
      
      if (row) return row.id
      
      // Tam eşleşme yoksa, ürün adı kısmını eşleştir
      if (productNameOnly && productNameOnly !== name) {
        // Ürün adının sonunda olan kısmı içeren ürünleri bul
        row = db.prepare(`
          SELECT p.id as id
          FROM active_products p
          JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
          WHERE (
            p.name LIKE ? OR 
            p.name LIKE ? OR
            (p.name LIKE ? AND p.name NOT LIKE ?)
          ) AND p.id != ?
          GROUP BY p.id
          ORDER BY COUNT(b.id) DESC
          LIMIT 1
        `).get(
          `%${productNameOnly}%`,
          `% - ${productNameOnly}%`,
          `%${productNameOnly}%`,
          `% - %${productNameOnly}%`,
          excludeId
        ) as { id: string } | undefined
        
        if (row) {
          logger.info('[BOM EŞLEŞTİRME] Ürün adı kısmı ile eşleşme bulundu', {
            original_name: name,
            extracted_name: productNameOnly,
            matched_product_id: row.id
          })
          return row.id
        }
      }
      
      return null
    }

    const actorId = await getActorId(request)
    const transaction = db.transaction(() => {
      // Transaction içinde say - yarış koşullarını önle
      const todayCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM product_serial_numbers 
        WHERE product_id = ? AND date(created_at) = date('now')
      `).get(product_id) as any

      const startSequence = (todayCount?.count || 0) + 1

      // Barkodları transaction içinde oluştur
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

      // 1. Stok kontrolü ve maliyet hesaplama
      let bomProductId = product_id
      let bom = db.prepare(`
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
      `).all(bomProductId) as any[]

      if (bom.length === 0) {
        const fallbackId = findBomProductIdByName(product.name, product_id)
        if (fallbackId) {
          bomProductId = fallbackId
          bom = db.prepare(`
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
          `).all(bomProductId) as any[]

          if (bom.length > 0) {
            logger.info('[Production API] BOM isim eşleşmesi ile bulundu', {
              product_id,
              fallback_product_id: bomProductId,
              product_name: product.name,
            })
          }
        }
      }

      // Stok yeterlilişini kontrol et (fire dahil)
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
        
        // Stoku düş (�NEMLİ: movement_type 'out' olduşu için stok düşmeli)
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
})

