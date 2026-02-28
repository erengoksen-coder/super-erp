import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { bayiFilter } from '@/lib/auth/bayi-filter'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { generateShipmentNumber } from '@/lib/utils/codeGenerator.server'
import { resolveUnitFactor } from '@/lib/units'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_LIST } from '@/lib/api/cache'
import { apiLogger } from '@/lib/api/logger'
import { getUserIdsWantingNotification } from '@/lib/notifications/preferences'

type ShipmentRow = {
  id: string
  customer_id: string
  status: string
  shipment_number: string
  shipment_date: string
  total_amount?: number | null
  tax_rate?: number | null
  tax_amount?: number | null
  final_amount?: number | null
  invoice_id?: string | null
  invoice_number?: string | null
  created_at?: string | null
  customer_name?: string | null
  customer_code?: string | null
  item_count?: number | null
  total_quantity?: number | null
  [key: string]: unknown
}

type ShipmentItemRow = {
  id: string
  shipment_id: string
  product_id: string
  quantity: number
  unit_price: number | null
  total_price: number | null
  serial_numbers: string | null
  notes: string | null
  product_name?: string
  product_sku?: string
}

type ShipmentInputItem = {
  product_id: string
  quantity: number
  product_name?: string
  barcodes?: string[]
  serial_numbers?: string[]
  notes?: string
}

type ShipmentCreateInput = {
  customer_id?: string
  shipment_date?: string
  items?: ShipmentInputItem[]
  notes?: string
  total_amount?: number
  tax_rate?: number
  /** Kısmi sevk (aynı üretim emrindeki tüm ürünler sevk edilmiyorsa) zorunlu açıklama */
  partial_shipment_reason?: string | null
}

type CustomerRow = {
  id: string
}

type BomItemRow = {
  quantity: number
  fire_percentage: number | null
  unit_price: number | null
  unit?: string | null
  material_unit?: string | null
  material_id?: string | null
}

type ProductPriceRow = {
  selling_price: number | null
}

type BarcodeRow = {
  barcode: string
}

type ProductNameSkuRow = {
  name: string
  sku: string
}

// GET: Tüm sevkiyatları getir
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status')
    const completed = searchParams.get('completed')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const db = getDatabase()

    let query = `
      SELECT 
        s.*,
        a.name as customer_name,
        a.code as customer_code,
        COUNT(si.id) as item_count,
        SUM(si.quantity) as total_quantity
      FROM shipments s
      JOIN accounts a ON s.customer_id = a.id
      LEFT JOIN shipment_items si ON s.id = si.shipment_id
      WHERE s.deleted_at IS NULL
    `
    const params: string[] = []

    // Bayi kullanıcılar sadece kendi sevkiyatlarını görür
    const bf = bayiFilter(user.userId, user.role, 'a.name')
    if (bf.clause) {
      query += bf.clause
      params.push(...bf.params)
    }

    if (customerId) {
      query += ' AND s.customer_id = ?'
      params.push(customerId)
    }

    if (status) {
      query += ' AND s.status = ?'
      params.push(status)
    }

    // Yapılan işlem filtresi (tamamlanan: delivered + in_transit)
    if (completed === 'true') {
      query += ' AND (s.status = ? OR s.status = ?)'
      params.push('delivered', 'in_transit')
    }

    if (startDate) {
      query += ' AND s.shipment_date >= ?'
      params.push(startDate)
    }

    if (endDate) {
      query += ' AND s.shipment_date <= ?'
      params.push(endDate)
    }

    query += ' GROUP BY s.id ORDER BY s.shipment_date DESC, s.created_at DESC'

    const shipments = db.prepare(query).all(...params) as ShipmentRow[]

    // Her sevkiyat için kalemleri getir
    const shipmentsWithItems = shipments.map((shipment) => {
      const items = db.prepare(`
        SELECT 
          si.*,
          p.name as product_name,
          p.sku as product_sku
        FROM shipment_items si
        JOIN active_products p ON si.product_id = p.id
        WHERE si.shipment_id = ? AND si.deleted_at IS NULL
        ORDER BY si.created_at
      `).all(shipment.id) as ShipmentItemRow[]

      return {
        ...shipment,
        items,
      }
    })

    return ok(shipmentsWithItems, { headers: CACHE_HEADERS_LIST })
  } catch (error: any) {
    apiLogger.error('Shipments API GET failed', { error: error?.message })
    return fail(error.message, { status: 500 })
  }
})

// POST: Yeni sevkiyat oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as ShipmentCreateInput
    const { customer_id, shipment_date, items, notes, total_amount, tax_rate, partial_shipment_reason } = body

    if (!customer_id || !shipment_date || !items || items.length === 0) {
      return fail('customer_id, shipment_date ve items (en az 1 kalem) gerekli', { status: 400 })
    }

    const db = getDatabase()

    // Kısmi sevk kontrolü: Aynı üretim emrindeki tüm barkodlar sevk edilmiyorsa açıklama zorunlu
    const allBarcodes = items.flatMap((i) => i.barcodes || i.serial_numbers || [])
    if (allBarcodes.length > 0) {
      const placeholders = allBarcodes.map(() => '?').join(',')
      const rows = db.prepare(`
        SELECT barcode, serial_number, production_order_id
        FROM product_serial_numbers
        WHERE barcode IN (${placeholders}) OR serial_number IN (${placeholders})
      `).all(...allBarcodes, ...allBarcodes) as Array<{ barcode: string; serial_number: string | null; production_order_id: string | null }>
      const valueToPoId = new Map<string, string | null>()
      for (const r of rows) {
        if (r.barcode) valueToPoId.set(r.barcode, r.production_order_id)
        if (r.serial_number) valueToPoId.set(r.serial_number, r.production_order_id)
      }
      const poIdToShippingCount = new Map<string, number>()
      for (const b of allBarcodes) {
        const poId = valueToPoId.get(b) ?? null
        if (poId) {
          poIdToShippingCount.set(poId, (poIdToShippingCount.get(poId) ?? 0) + 1)
        }
      }
      for (const [poId, shippingCount] of poIdToShippingCount) {
        const totalReady = db.prepare(`
          SELECT COUNT(*) as c FROM product_serial_numbers
          WHERE production_order_id = ?
            AND ready_for_shipment = 1
            AND (shipment_id IS NULL OR shipment_id = '')
        `).get(poId) as { c: number }
        if (totalReady.c > shippingCount) {
          const reasonTrim = (partial_shipment_reason ?? '').trim()
          if (!reasonTrim) {
            return fail(
              'Bu sevkiyatta aynı üretim emrindeki tüm ürünler yer almıyor. Diğer ürünlerin neden sevk edilmediğini açıklamanız zorunludur (açıklama alanını doldurun).',
              { status: 400 }
            )
          }
          break
        }
      }
    }

    // Cari (müşteri) kontrolü: Önce id ile ara, bulunamazsa kod (MUS-001 vb.) ile ara
    let customer: (CustomerRow & { balance?: number | null; risk_limit?: number | null; discount_rate?: number | null; name?: string | null }) | undefined
    const customerIdTrimmed = String(customer_id || '').trim()
    try {
      customer = db.prepare(`
        SELECT id, name, balance, risk_limit, COALESCE(discount_rate, 0) as discount_rate
        FROM accounts WHERE id = ? AND deleted_at IS NULL
      `).get(customerIdTrimmed) as (CustomerRow & { balance?: number | null; risk_limit?: number | null; discount_rate?: number | null; name?: string | null }) | undefined
      if (!customer && /^[A-Za-z]+-\d+$/.test(customerIdTrimmed)) {
        const byCode = db.prepare(`
          SELECT id, name, balance, risk_limit, COALESCE(discount_rate, 0) as discount_rate
          FROM accounts WHERE code = ? AND deleted_at IS NULL
        `).get(customerIdTrimmed) as (CustomerRow & { balance?: number | null; risk_limit?: number | null; discount_rate?: number | null; name?: string | null }) | undefined
        if (byCode) customer = byCode
      }
    } catch (e: any) {
      if (e.message?.includes('no such column: discount_rate')) {
        customer = db.prepare('SELECT id, name, balance, risk_limit FROM accounts WHERE id = ? AND deleted_at IS NULL')
          .get(customerIdTrimmed) as (CustomerRow & { balance?: number | null; risk_limit?: number | null; discount_rate?: number | null; name?: string | null }) | undefined
        if (!customer && /^[A-Za-z]+-\d+$/.test(customerIdTrimmed)) {
          const byCode = db.prepare('SELECT id, name, balance, risk_limit FROM accounts WHERE code = ? AND deleted_at IS NULL').get(customerIdTrimmed) as any
          if (byCode) {
            customer = byCode
              ; (customer as any).discount_rate = 0
          }
        } else if (customer) (customer as any).discount_rate = 0
      } else {
        throw e
      }
    }
    if (!customer) {
      return fail('Müşteri/Cari bulunamadı. Cari kodunun (örn. MUS-001) veya cari ID\'sinin doğru olduğundan emin olun.', { status: 404 })
    }
    const resolvedCustomerId = customer.id

    const shipmentId = randomUUID()
    const shipmentNumber = await generateShipmentNumber()

    // Ürün fiyatlarını BOM'dan hesapla
    let calculatedTotalAmount = 0
    const itemPrices: { [key: string]: number } = {}

    if (items && items.length > 0) {
      for (const item of items) {
        // BOM maliyetini hesapla
        let bomItems = db.prepare(`
          SELECT 
            b.quantity_required as quantity,
            b.unit as unit,
            b.fire_percentage,
            m.unit_price,
            m.unit as material_unit,
            m.id as material_id
          FROM bom b
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
          JOIN materials m ON b.material_id = m.id
          WHERE b.product_id = ? AND b.deleted_at IS NULL
        `).all(item.product_id) as BomItemRow[]

        // Aktif versiyonda BOM bulunamadıysa, fallback mekanizmasına geç (tüm versiyonlarda arama yapma, sadece aktif versiyonu kullan)

        // Eğer hala BOM bulunamadıysa, ürün adına göre eşleştirme yap
        if (bomItems.length === 0) {
          const product = db.prepare('SELECT id, name, sku FROM active_products WHERE id = ?').get(item.product_id) as { id: string; name: string; sku: string } | undefined
          if (product) {
            // Ürün adından SKU kısmını çıkar (örn: "PRD-127652 - ATLAS ÜÇLÜ" -> "ATLAS ÜÇLÜ")
            const extractProductName = (fullName: string): string => {
              if (!fullName) return ''
              if (fullName.includes(' - ')) {
                const parts = fullName.split(' - ')
                return parts[parts.length - 1].trim()
              }
              const skuMatch = fullName.match(/^PRD-\d+\s*-\s*(.+)$/i)
              if (skuMatch) {
                return skuMatch[1].trim()
              }
              return fullName.trim()
            }

            const productNameOnly = extractProductName(product.name)

            if (productNameOnly) {
              // Aynı isimli ürünlerde BOM ara
              const fallbackProducts = db.prepare(`
                SELECT DISTINCT p.id, p.name, p.sku
                FROM active_products p
                JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
                JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
                WHERE p.id != ? AND (
                  p.name = ? OR 
                  p.name LIKE ? OR
                  (p.name LIKE ? AND p.name NOT LIKE ?)
                )
                GROUP BY p.id, p.name, p.sku
                ORDER BY COUNT(b.id) DESC
                LIMIT 1
              `).all(
                product.id,
                productNameOnly,
                `% - ${productNameOnly}%`,
                `%${productNameOnly}%`,
                `% - %${productNameOnly}%`
              ) as Array<{ id: string; name: string; sku: string }>

              if (fallbackProducts.length > 0) {
                const fallbackProduct = fallbackProducts[0]
                console.log(`[Sevkiyat BOM] Fallback: ${product.name} (${product.id}) → ${fallbackProduct.name} (${fallbackProduct.id})`)

                // Fallback ürün için BOM al (sadece aktif versiyon)
                bomItems = db.prepare(`
              SELECT 
                b.quantity_required as quantity,
                b.unit as unit,
                b.fire_percentage,
                m.unit_price,
                m.unit as material_unit,
                m.id as material_id
              FROM bom b
              JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
              JOIN materials m ON b.material_id = m.id
              WHERE b.product_id = ? AND b.deleted_at IS NULL
            `).all(fallbackProduct.id) as BomItemRow[]
              }
            }
          }
        }

        // Toplam maliyeti hesapla
        let bomCost = 0
        for (const bomItem of bomItems) {
          const quantityWithFire = bomItem.quantity * (1 + (bomItem.fire_percentage || 0) / 100)
          const fromUnit = (bomItem.unit || bomItem.material_unit || '').toString()
          const toUnit = (bomItem.material_unit || '').toString()
          const factor = resolveUnitFactor(db, bomItem.material_id || null, fromUnit, toUnit)
          const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
          const unitPrice = bomItem.unit_price || 0
          bomCost += convertedQuantity * unitPrice
        }

        // Eşer BOM maliyeti yoksa, selling_price kullan
        const unitPrice = bomCost > 0 ? bomCost : (() => {
          const product = db.prepare('SELECT selling_price FROM active_products WHERE id = ?').get(item.product_id) as ProductPriceRow | undefined
          return product?.selling_price || 0
        })()

        const itemTotal = unitPrice * (item.quantity || 0)
        calculatedTotalAmount += itemTotal
        itemPrices[item.product_id] = unitPrice
      }
    }

    // Eşer total_amount gönderilmişse onu kullan, yoksa hesaplananı kullan
    const baseTotalAmount = total_amount || calculatedTotalAmount

    // İskonto: Caride (accounts) kayıtlı iskonto oranı uygulanır
    const discountRate = customer.discount_rate ?? 0
    const discountAmount = (baseTotalAmount * discountRate) / 100
    const amountAfterDiscount = baseTotalAmount - discountAmount

    const finalTaxRate = tax_rate || 0
    const taxAmount = (amountAfterDiscount * finalTaxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount

    const currentBalance = customer.balance || 0
    const riskLimit = customer.risk_limit || 0
    const exceedsRiskLimit = riskLimit > 0 && currentBalance + finalAmount > riskLimit

    // Risk limitini aşıyorsa onay beklemeli
    let approvalStatus: string | null = null
    let approvalRequestedAt: string | null = null

    if (exceedsRiskLimit) {
      approvalStatus = 'pending'
      approvalRequestedAt = new Date().toISOString()
    }

    const shipmentNotes = (notes || '') + (
      (partial_shipment_reason && partial_shipment_reason.trim())
        ? (notes ? '\n\n' : '') + `Kısmi sevk açıklaması: ${partial_shipment_reason.trim()}`
        : ''
    )

    db.transaction(() => {
      // Sevkiyat kaydı oluştur
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)

      db.prepare(`
        INSERT INTO shipments 
        (id, shipment_number, customer_id, shipment_date, total_quantity, total_amount, discount_rate, discount_amount, tax_rate, tax_amount, final_amount, notes, status, approval_status, approval_requested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        shipmentId,
        shipmentNumber,
        resolvedCustomerId,
        shipment_date,
        totalQuantity,
        baseTotalAmount, // İskonto öncesi BOM fiyatı (Ara Toplam)
        discountRate,
        discountAmount,
        finalTaxRate,
        taxAmount,
        finalAmount,
        shipmentNotes,
        exceedsRiskLimit ? 'pending_approval' : 'delivered', // Risk limiti aşıldıysa onay bekliyor
        approvalStatus || null,
        approvalRequestedAt || null
      )

      // Risk limitini aşıyorsa sevkiyat bildirimi tercihi açık olan yetkili kullanıcılara bildirim gönder
      if (exceedsRiskLimit) {
        const userIdsWanting = new Set(getUserIdsWantingNotification(db, 'shipment_approved'))
        const approvalUsers = db.prepare(`
          SELECT id, full_name, username
          FROM users
          WHERE (role = 'admin' OR role = 'manager' OR role = 'muhasebe' OR role LIKE '%muhasebe%' OR role LIKE '%yönetici%' OR role LIKE '%yonetici%')
            AND deleted_at IS NULL
            AND is_approved = 1
        `).all() as Array<{ id: string; full_name: string | null; username: string }>
        const now = new Date().toISOString()
        const customerName = customer.name || 'Bilinmeyen Müşteri'
        const notificationTitle = 'Risk Limiti Aşan Sevkiyat Onayı Gerekli'
        const notificationMessage = `${customerName} müşterisi için ${shipmentNumber} numaralı sevkiyat risk limitini aşıyor. Limit: ${riskLimit.toFixed(2)} ₺, Mevcut Bakiye: ${currentBalance.toFixed(2)} ₺, Yeni Bakiye: ${(currentBalance + finalAmount).toFixed(2)} ₺. Onay için sevkiyat detay sayfasına gidin.`
        const insertNotification = db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, created_at)
          VALUES (?, ?, ?, ?, 'warning', 'shipment', ?, ?)
        `)
        for (const u of approvalUsers) {
          if (!userIdsWanting.has(u.id)) continue
          const notificationId = randomUUID()
          insertNotification.run(notificationId, u.id, notificationTitle, notificationMessage, shipmentId, now)
        }
      }

      // Müşteri cari hesabına toplam borç yaz (sadece risk limiti aşılmadıysa veya onaylandıysa)
      // Bakiye, account_transactions'a yazılan tutarların toplamı (iskonto + KDV dahil) ile aynı olmalı (fiş tutarı tutar)
      if (!exceedsRiskLimit) {
        const balanceUpdateAmount = finalAmount
        db.prepare(`
          UPDATE accounts
          SET balance = balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(balanceUpdateAmount, resolvedCustomerId)
      }

      // Sevkiyat kalemlerini ekle ve ürünleri sevkiyata başla
      for (const item of items) {
        const itemId = randomUUID()
        const barcodes = item.barcodes || item.serial_numbers || []

        // Barkod sayısı kontrolü - ZORUNLU
        if (barcodes.length !== item.quantity) {
          throw new Error(`${item.product_name || 'Ürün'} için ${item.quantity} adet gerekli, ${barcodes.length} adet barkod girildi. Lütfen tüm barkodları girin.`)
        }

        // Barkodların geçerlilişini kontrol et
        if (barcodes.length > 0) {
          const placeholders = barcodes.map(() => '?').join(',')
          const existingBarcodes = db.prepare(`
            SELECT barcode FROM product_serial_numbers
            WHERE barcode IN (${placeholders})
              AND product_id = ?
              AND ready_for_shipment = 1
              AND (shipment_id IS NULL OR shipment_id = '')
          `).all(...barcodes, item.product_id) as BarcodeRow[]

          if (existingBarcodes.length !== barcodes.length) {
            const foundBarcodes = existingBarcodes.map(b => b.barcode)
            const missingBarcodes = barcodes.filter(b => !foundBarcodes.includes(b))
            throw new Error(`${item.product_name || 'Ürün'} için geçersiz veya sevk edilebilir olmayan barkodlar: ${missingBarcodes.join(', ')}`)
          }
        }

        const serialNumbersJson = barcodes.length > 0 ? JSON.stringify(barcodes) : null

        // Kalem fiyatını hesapla (BOM fiyatı / adet)
        const unitPrice = itemPrices[item.product_id] || 0
        const itemTotalBeforeDiscount = unitPrice * (item.quantity || 0)

        // Carideki iskonto oranına göre kalem iskontosu
        const itemDiscountAmount = (itemTotalBeforeDiscount * discountRate) / 100
        const itemAmountAfterDiscount = itemTotalBeforeDiscount - itemDiscountAmount

        // Sevk edilen ürün kalemi: total_price = cari iskontosu uygulanmış tutar (iskonto sonrası, KDV öncesi)
        db.prepare(`
          INSERT INTO shipment_items 
          (id, shipment_id, product_id, quantity, unit_price, total_price, serial_numbers, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          shipmentId,
          item.product_id,
          item.quantity,
          unitPrice,
          itemAmountAfterDiscount, // Carideki iskonto oranına göre güncellenmiş tutar
          serialNumbersJson,
          item.notes || ''
        )

        // Ürün bilgilerini al
        const product = db.prepare('SELECT name, sku FROM active_products WHERE id = ?').get(item.product_id) as ProductNameSkuRow | undefined
        const productName = product?.name || item.product_name || 'Ürün'
        const productSku = product?.sku || ''

        // KDV dahil tutarı hesapla (kalem bazında orantılı)
        // Her kalem için: (itemAmountAfterDiscount / amountAfterDiscount) * taxAmount
        const itemTaxAmount = amountAfterDiscount > 0 ? (itemAmountAfterDiscount / amountAfterDiscount) * taxAmount : 0
        const itemFinalAmount = itemAmountAfterDiscount + itemTaxAmount

        const transactionId = randomUUID()
        // Açıklamada cari hesaba yazılan tutarla eşleşmeli (iskonto sonrası + KDV dahil tutar)
        // BOM fiyatı (iskonto öncesi) ve iskonto bilgisi ayrı kolonlarda gösterilecek
        let description = `Sevkiyat: ${shipmentNumber} | Ürün: ${productName}${productSku ? ` (${productSku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${unitPrice.toFixed(2)} ₺`

        // İskonto bilgisini ekle (eğer varsa)
        if (discountRate > 0 && itemDiscountAmount > 0) {
          description += ` | İskonto: %${discountRate.toFixed(2)} (${itemDiscountAmount.toFixed(2)} ₺)`
        }

        // KDV bilgisini ekle (eğer varsa)
        if (finalTaxRate > 0 && itemTaxAmount > 0) {
          description += ` | KDV: %${finalTaxRate.toFixed(2)} (${itemTaxAmount.toFixed(2)} ₺)`
        }

        description += ` | Toplam: ${itemFinalAmount.toFixed(2)} ₺`

        db.prepare(`
          INSERT INTO account_transactions 
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'debit', ?, 'shipment_item', ?, ?, CURRENT_TIMESTAMP)
        `).run(
          transactionId,
          resolvedCustomerId,
          itemFinalAmount, // İskonto sonrası + KDV dahil tutar (cari hesaba bu tutar yazılır)
          itemId,
          description
        )

        // Barkodları sevkiyata bağla: shipment_id + status = shipped (mamül depoda görünmesin)
        if (barcodes.length > 0) {
          const placeholders = barcodes.map(() => '?').join(',')
          try {
            db.prepare(`
              UPDATE product_serial_numbers
              SET shipment_id = ?,
                  status = 'shipped',
                  ready_for_shipment = 0,
                  updated_at = CURRENT_TIMESTAMP
              WHERE barcode IN (${placeholders})
                AND product_id = ?
            `).run(shipmentId, ...barcodes, item.product_id)

            // Ürün stok miktarını düş (mamül depodan düşsün)
            db.prepare(`
              UPDATE products
              SET stock_amount = stock_amount - ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(item.quantity, item.product_id)
          } catch (e: any) {
            // updated_at kolonu yoksa, sadece diğer alanları güncelle
            if (e.message?.includes('no such column: updated_at')) {
              db.prepare(`
                UPDATE product_serial_numbers
                SET shipment_id = ?,
                    status = 'shipped',
                    ready_for_shipment = 0
                WHERE barcode IN (${placeholders})
                  AND product_id = ?
              `).run(shipmentId, ...barcodes, item.product_id)

              // Ürün stok miktarını düş (mamül depodan düşsün)
              db.prepare(`
                UPDATE products
                SET stock_amount = stock_amount - ?
                WHERE id = ?
              `).run(item.quantity, item.product_id)
            } else {
              throw e
            }
          }
        }
      }
    })()

    // Oluşturulan sevkiyatı getir
    const shipment = db.prepare(`
      SELECT 
        s.*,
        a.name as customer_name,
        a.code as customer_code,
        a.address as customer_address,
        a.phone as customer_phone,
        a.email as customer_email
      FROM shipments s
      JOIN accounts a ON s.customer_id = a.id
      WHERE s.id = ?
    `).get(shipmentId) as ShipmentRow | undefined

    const shipmentItems = db.prepare(`
      SELECT 
        si.*,
        p.name as product_name,
        p.sku as product_sku
      FROM shipment_items si
      JOIN active_products p ON si.product_id = p.id
      WHERE si.shipment_id = ?
    `).all(shipmentId) as ShipmentItemRow[]

    const result = { ...shipment, items: shipmentItems }
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
    void dispatchWebhook('shipment.created', {
      shipment_id: shipmentId,
      shipment_number: shipment?.shipment_number,
      customer_id: shipment?.customer_id,
      status: shipment?.status,
      item_count: shipmentItems.length,
    })

    return ok(result, { status: 201 })
  } catch (error: any) {
    apiLogger.error('Shipments API POST failed', { error: error?.message })
    return fail(error.message, { status: 500 })
  }
})


