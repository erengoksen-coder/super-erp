import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { generateNextCode } from '@/lib/utils/codeGenerator'
import { resolveUnitFactor } from '@/lib/units'
import { apiLogger } from '@/lib/api/logger'
import { ok } from '@/lib/api/response'
import { PAGINATION } from '@/lib/constants'
import { getInvoicePrefixSale, getInvoicePrefixPurchase } from '@/lib/numberFormat'

type InvoiceRow = {
  id: string
  invoice_number: string
  shipment_id: string | null
  customer_id: string
  invoice_date: string
  type: string
  status: string
  total_amount: number
  tax_rate: number
  tax_amount: number
  final_amount: number
  notes?: string | null
  customer_name?: string | null
  customer_code?: string | null
  shipment_number?: string | null
}

type InvoiceCreateInput = {
  shipment_id?: string
  invoice_date?: string
  type?: 'sale' | 'purchase'
  notes?: string
  /** Alış faturası için: tedarikçi cari id */
  customer_id?: string
  /** Alış faturası kalemleri: açıklama, miktar, birim fiyat; material_id varsa hammadde depoya stok girişi yapılır */
  items?: Array<{ description: string; quantity: number; unit_price: number; material_id?: string }>
  tax_rate?: number
  /** Alış için belge türü: 'invoice' (Fatura) veya 'slip' (Fiş) */
  document_kind?: 'invoice' | 'slip'
}

// GET: Faturaları listele (limit/offset ile sayfalama)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT), 10) || PAGINATION.DEFAULT_LIMIT),
      PAGINATION.MAX_LIMIT
    )
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)

    const db = getDatabase()
    const whereClause: string[] = ['i.deleted_at IS NULL']
    const params: string[] = []

    if (customerId) {
      whereClause.push('i.customer_id = ?')
      params.push(customerId)
    }
    if (status) {
      whereClause.push('i.status = ?')
      params.push(status)
    }
    if (type) {
      whereClause.push('i.type = ?')
      params.push(type)
    }
    if (startDate) {
      whereClause.push('i.invoice_date >= ?')
      params.push(startDate)
    }
    if (endDate) {
      whereClause.push('i.invoice_date <= ?')
      params.push(endDate)
    }

    const whereSql = whereClause.join(' AND ')
    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE ${whereSql}
    `).get(...params) as { total: number }
    const total = countRow?.total ?? 0

    const query = `
      SELECT 
        i.*,
        a.name as customer_name,
        a.code as customer_code,
        s.shipment_number
      FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE ${whereSql}
      ORDER BY i.invoice_date DESC, i.created_at DESC
      LIMIT ? OFFSET ?
    `
    const invoices = db.prepare(query).all(...params, limit, offset) as InvoiceRow[]
    return ok(invoices, { meta: { total, limit, offset } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invoices API GET failed'
    apiLogger.error('Invoices API GET failed', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
})

// POST: Sevkiyattan fatura veya alış (tedarikçi) faturası oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as InvoiceCreateInput
    const { shipment_id, invoice_date, type = 'sale', notes, customer_id, items = [], tax_rate: bodyTaxRate, document_kind: documentKind } = body

    const db = getDatabase()

    // —— Alış faturası (tedarikçiden gelen fiş/fatura) ——
    if (type === 'purchase' && customer_id && Array.isArray(items) && items.length > 0 && !shipment_id) {
      const supplier = db.prepare("SELECT id FROM accounts WHERE id = ? AND type = 'supplier' AND (deleted_at IS NULL OR deleted_at = '')")
        .get(customer_id) as { id: string } | undefined
      if (!supplier) {
        return NextResponse.json({ error: 'Tedarikçi cari hesabı bulunamadı veya geçersiz' }, { status: 400 })
      }
      const invoiceDate = (invoice_date || new Date().toISOString().split('T')[0]).toString().slice(0, 10)
      const taxRate = typeof bodyTaxRate === 'number' && bodyTaxRate >= 0 ? bodyTaxRate : 0
      const placeholders = db.prepare("SELECT id FROM products WHERE id = 'SYS-PURCHASE-LINE'").get() as { id: string } | undefined
      if (!placeholders) {
        return NextResponse.json({ error: 'Sistem ürünü bulunamadı (alış kalemi). Veritabanı güncel değil olabilir.' }, { status: 500 })
      }
      const placeholderProductId = placeholders.id
      let totalAmount = 0
      const validItems = items
        .filter((i) => i != null && Number(i.quantity) > 0 && Number(i.unit_price) >= 0)
        .map((i) => {
          const q = Number(i.quantity)
          const up = Number(i.unit_price)
          const lineTotal = q * up
          totalAmount += lineTotal
          const materialId = typeof (i as any).material_id === 'string' && (i as any).material_id.trim() !== '' ? (i as any).material_id.trim() : undefined
          return { description: String(i.description || '').trim() || 'Kalem', quantity: q, unit_price: up, total_price: lineTotal, material_id: materialId }
        })
      if (validItems.length === 0) {
        return NextResponse.json({ error: 'En az bir geçerli kalem girin (açıklama, miktar > 0, birim fiyat >= 0)' }, { status: 400 })
      }
      const taxAmount = (totalAmount * taxRate) / 100
      const finalAmount = totalAmount + taxAmount
      const year = new Date().getFullYear()
      const prefixWithYear = `${getInvoicePrefixPurchase()}-${year}`
      const lastRow = db.prepare(
        `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`
      ).get(`${prefixWithYear}-%`) as { invoice_number?: string } | undefined
      const nextNum = generateNextCode(lastRow?.invoice_number ?? null, { prefix: prefixWithYear, padding: 3 })
      const documentKindVal = documentKind === 'slip' || documentKind === 'invoice' ? documentKind : 'invoice'
      const invoiceId = randomUUID()
      db.transaction(() => {
        db.prepare(`
          INSERT INTO invoices
          (id, invoice_number, shipment_id, customer_id, invoice_date, type, status, total_amount, discount_rate, discount_amount, tax_rate, tax_amount, final_amount, notes, document_kind)
          VALUES (?, ?, NULL, ?, ?, 'purchase', 'issued', ?, 0, 0, ?, ?, ?, ?, ?, ?)
        `).run(invoiceId, nextNum, customer_id, invoiceDate, totalAmount, taxRate, taxAmount, finalAmount, notes ?? null, documentKindVal)
        const insertItem = db.prepare(`
          INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total_price, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        const warehouseId = DEFAULT_WAREHOUSE_ID
        for (const item of validItems) {
          const itemId = randomUUID()
          insertItem.run(itemId, invoiceId, placeholderProductId, item.quantity, item.unit_price, item.total_price, item.description)
          if (item.material_id) {
            const material = db.prepare('SELECT id FROM materials WHERE id = ? AND deleted_at IS NULL').get(item.material_id) as { id: string } | undefined
            if (material) {
              const qty = item.quantity
              applyMaterialStockChange(db, item.material_id, qty)
              db.prepare(`
                INSERT INTO material_stocks (id, material_id, warehouse_id, quantity)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(material_id, warehouse_id)
                DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP
              `).run(`ms_${item.material_id}_${warehouseId}`, item.material_id, warehouseId, qty)
              const movementId = randomUUID()
              db.prepare(`
                INSERT INTO stock_movements
                (id, material_id, movement_type, quantity, reference_type, reference_id, invoice_number, shipment_number, notes, user_id, warehouse_id, to_warehouse_id, created_at)
                VALUES (?, ?, 'in', ?, 'purchase_invoice', ?, ?, NULL, ?, NULL, ?, ?, CURRENT_TIMESTAMP)
              `).run(movementId, item.material_id, qty, itemId, nextNum, `Alış ${documentKindVal === 'slip' ? 'fişi' : 'faturası'} ${nextNum}`, warehouseId, warehouseId)
              db.prepare('UPDATE materials SET purchase_price = ?, last_purchase_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.unit_price, invoiceDate, item.material_id)
            }
          }
        }
        const txId = randomUUID()
        db.prepare(`
          INSERT INTO account_transactions
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'credit', ?, 'purchase_invoice', ?, ?, CURRENT_TIMESTAMP)
        `).run(txId, customer_id, finalAmount, invoiceId, documentKindVal === 'slip' ? `Alış fişi ${nextNum} (alacak)` : `Alış faturası ${nextNum} (alacak)`)
        const balanceRow = db.prepare(`
          SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
                 COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
          FROM account_transactions WHERE account_id = ?
        `).get(customer_id) as { balance: number }
        db.prepare('UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceRow.balance, customer_id)
      })()
      return NextResponse.json({
        success: true,
        invoice: { id: invoiceId, invoice_number: nextNum, customer_id, final_amount: finalAmount },
      }, { status: 201 })
    }

    if (!shipment_id) {
      return NextResponse.json({ error: 'Satış için shipment_id veya alış için type=purchase, customer_id ve items gerekli' }, { status: 400 })
    }

    const shipment = db.prepare(`
      SELECT * FROM shipments
      WHERE id = ? AND deleted_at IS NULL
    `).get(shipment_id) as any
    if (!shipment) {
      return NextResponse.json({ error: 'Sevkiyat bulunamadı' }, { status: 404 })
    }
    if (shipment.invoice_id) {
      return NextResponse.json({ error: 'Bu sevkiyat zaten faturalanmış' }, { status: 400 })
    }

    const shipmentItems = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku as product_sku
      FROM shipment_items si
      JOIN active_products p ON si.product_id = p.id
      WHERE si.shipment_id = ? AND si.deleted_at IS NULL
      ORDER BY si.created_at
    `).all(shipment_id) as any[]

    if (shipmentItems.length === 0) {
      return NextResponse.json({ error: 'Sevkiyat kalemi bulunamadı' }, { status: 400 })
    }

    const invoiceDate = invoice_date || shipment.shipment_date || new Date().toISOString().slice(0, 10)

    // Cari bilgilerini al (iskonto oranı için)
    // discount_rate kolonu yoksa 0 olarak kabul et
    let customer: { id: string; discount_rate?: number; balance?: number; risk_limit?: number } | undefined
    try {
      customer = db.prepare(`
        SELECT id, discount_rate, balance, risk_limit
        FROM accounts
        WHERE id = ?
      `).get(shipment.customer_id) as { id: string; discount_rate?: number; balance?: number; risk_limit?: number } | undefined
    } catch (e: any) {
      // discount_rate kolonu yoksa, sadece diğer kolonları al
      if (e.message?.includes('no such column: discount_rate')) {
        customer = db.prepare(`
          SELECT id, balance, risk_limit
          FROM accounts
          WHERE id = ?
        `).get(shipment.customer_id) as { id: string; discount_rate?: number; balance?: number; risk_limit?: number } | undefined
        if (customer) {
          customer.discount_rate = 0
        }
      } else {
        throw e
      }
    }

    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 })
    }

    // Önce BOM fiyatlarını hesapla ve toplam tutarı bul (HER ZAMAN BOM'dan hesapla)
    let baseTotalAmount = 0
    const itemsWithBomPrices: Array<{
      product_id: string
      quantity: number
      unit_price: number
      total_price: number
      notes?: string | null
    }> = []

    for (const item of shipmentItems) {
      // Her zaman BOM'dan fiyat hesapla
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
      `).all(item.product_id) as Array<{
        quantity: number
        unit: string | null
        fire_percentage: number | null
        unit_price: number
        material_unit: string | null
        material_id: string | null
      }>

      // Eğer aktif versiyonda BOM bulunamadıysa, tüm versiyonlarda ara
      if (bomItems.length === 0) {
        bomItems = db.prepare(`
          SELECT 
            b.quantity_required as quantity,
            b.unit as unit,
            b.fire_percentage,
            m.unit_price,
            m.unit as material_unit,
            m.id as material_id
          FROM bom b
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
          JOIN materials m ON b.material_id = m.id
          WHERE b.product_id = ? AND b.deleted_at IS NULL
          ORDER BY bv.version_no DESC
          LIMIT 100
        `).all(item.product_id) as Array<{
          quantity: number
          unit: string | null
          fire_percentage: number | null
          unit_price: number
          material_unit: string | null
          material_id: string | null
        }>
      }

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
              console.log(`[Fatura BOM] Fallback: ${product.name} (${product.id}) → ${fallbackProduct.name} (${fallbackProduct.id})`)
              
              // Fallback ürün için BOM al
              bomItems = db.prepare(`
                SELECT 
                  b.quantity_required as quantity,
                  b.unit as unit,
                  b.fire_percentage,
                  m.unit_price,
                  m.unit as material_unit,
                  m.id as material_id
                FROM bom b
                JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
                JOIN materials m ON b.material_id = m.id
                WHERE b.product_id = ? AND b.deleted_at IS NULL
                ORDER BY bv.version_no DESC
                LIMIT 100
              `).all(fallbackProduct.id) as Array<{
                quantity: number
                unit: string | null
                fire_percentage: number | null
                unit_price: number
                material_unit: string | null
                material_id: string | null
              }>
            }
          }
        }
      }

      let bomCost = 0
      for (const bomItem of bomItems) {
        const quantityWithFire = bomItem.quantity * (1 + (bomItem.fire_percentage || 0) / 100)
        const fromUnit = (bomItem.unit || bomItem.material_unit || '').toString()
        const toUnit = (bomItem.material_unit || '').toString()
        const factor = resolveUnitFactor(db, bomItem.material_id || null, fromUnit, toUnit)
        const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
        const materialUnitPrice = bomItem.unit_price || 0
        bomCost += convertedQuantity * materialUnitPrice
      }

      // Sevk fişi ile uyum: Önce sevk kalemindeki birim fiyatı kullan (zaten BOM'dan hesaplanmış), yoksa BOM hesapla, o da yoksa selling_price
      let unitPrice = (item.unit_price != null && item.unit_price > 0)
        ? item.unit_price
        : (bomCost > 0 ? bomCost : (() => {
            const product = db.prepare('SELECT selling_price FROM active_products WHERE id = ?').get(item.product_id) as { selling_price?: number } | undefined
            return product?.selling_price || 0
          })())
      
      const totalPrice = unitPrice * (item.quantity || 0)
      
      baseTotalAmount += totalPrice
      itemsWithBomPrices.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        notes: item.notes || null
      })
    }

    // İskonto: Caride (accounts) kayıtlı iskonto oranı uygulanır
    const discountRate = customer.discount_rate ?? 0
    const discountAmount = (baseTotalAmount * discountRate) / 100
    const amountAfterDiscount = baseTotalAmount - discountAmount
    
    const taxRate = shipment.tax_rate || 0
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount

    const getNextInvoiceNumber = () => {
      const prefix = type === 'sale' ? getInvoicePrefixSale() : getInvoicePrefixPurchase()
      const year = new Date().getFullYear()
      const prefixWithYear = `${prefix}-${year}`
      const row = db.prepare(`
        SELECT invoice_number FROM invoices
        WHERE invoice_number LIKE ?
        ORDER BY invoice_number DESC
        LIMIT 1
      `).get(`${prefixWithYear}-%`) as { invoice_number?: string } | undefined
      return generateNextCode(row?.invoice_number || null, { prefix: prefixWithYear, padding: 3 })
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const invoiceId = randomUUID()
      try {
        const result = db.transaction(() => {
          const invoiceNumber = getNextInvoiceNumber()
          
          // Fatura kaydını oluştur (iskonto bilgisi ile)
          // total_amount = iskonto öncesi toplam (BOM fiyatları toplamı)
          // discount_amount = iskonto tutarı
          // amountAfterDiscount = iskonto sonrası tutar
          // tax_amount = KDV tutarı (iskonto sonrası üzerinden)
          // final_amount = nihai tutar (iskonto sonrası + KDV)
          db.prepare(`
            INSERT INTO invoices
            (id, invoice_number, shipment_id, customer_id, invoice_date, type, status, total_amount, discount_rate, discount_amount, tax_rate, tax_amount, final_amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?)
          `).run(
            invoiceId,
            invoiceNumber,
            shipment_id,
            shipment.customer_id,
            invoiceDate,
            type,
            baseTotalAmount, // İskonto öncesi toplam (BOM fiyatları toplamı)
            discountRate,
            discountAmount,
            taxRate,
            taxAmount,
            finalAmount,
            notes || shipment.notes || null
          )

          // Fatura kalemlerini ekle (BOM fiyatları ile - iskonto sonrası fiyatlar)
          // Her kalem için iskonto uygulanmış fiyatları kaydet
          const insertItem = db.prepare(`
            INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total_price, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          for (const item of itemsWithBomPrices) {
            // Kalem bazında iskonto hesapla
            const itemDiscountAmount = (item.total_price * discountRate) / 100
            const itemTotalAfterDiscount = item.total_price - itemDiscountAmount
            const itemUnitPriceAfterDiscount = item.quantity > 0 ? itemTotalAfterDiscount / item.quantity : 0
            
            insertItem.run(
              randomUUID(),
              invoiceId,
              item.product_id,
              item.quantity,
              itemUnitPriceAfterDiscount, // İskonto sonrası birim fiyat
              itemTotalAfterDiscount, // İskonto sonrası toplam fiyat
              item.notes || null
            )
          }

          db.prepare(`
            UPDATE shipments
            SET invoice_id = ?, invoice_number = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(invoiceId, invoiceNumber, shipment_id)

          // Fatura oluşturulduğunda cari hesaba transaction yazılmaz
          // Çünkü sevkiyat oluşturulurken zaten cari hesaba borç yazılmış (iskonto düşülmüş tutar ile)
          // Fatura sadece belge olarak kaydedilir, cari hesap işlemi sevkiyat üzerinden yapılır

          return { invoiceId, invoiceNumber, customer_id: shipment.customer_id, final_amount: finalAmount }
        })()

        const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
        void dispatchWebhook('invoice.issued', {
          invoice_id: result.invoiceId,
          invoice_number: result.invoiceNumber,
          shipment_id,
          customer_id: result.customer_id,
          final_amount: result.final_amount,
        })

        return NextResponse.json({
          success: true,
          invoice: {
            id: result.invoiceId,
            invoice_number: result.invoiceNumber,
            shipment_id,
          },
        }, { status: 201 })
      } catch (error: any) {
        const message = String(error?.message || '')
        if (message.includes('UNIQUE') && message.includes('invoice_number') && attempt < 2) {
          continue
        }
        throw error
      }
    }

    return NextResponse.json({ error: 'Fatura numarası oluşturulamadı' }, { status: 500 })
  } catch (error: any) {
    apiLogger.error('Invoices API POST failed', { error: error?.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

