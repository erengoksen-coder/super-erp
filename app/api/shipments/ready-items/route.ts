import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

type ReadyItemRow = {
  id: string
  product_id: string
  production_order_id: string | null
  barcode: string
  serial_number: string
  status: string | null
  ready_for_shipment: number
  shipment_id: string | null
  customer_id: string | null
  created_at: string
  product_name?: string
  product_sku?: string
  production_order_number?: string | null
  customer_name?: string | null
  customer_code?: string | null
}

type ReadyItemsGrouped = {
  product_id: string
  production_order_id: string | null
  production_order_number?: string | null
  product_name?: string
  product_sku?: string
  total_count: number
  /** Üretim emrindeki toplam barkod sayısı (mamül depo + üretimde); kısmi sevk için required_count bu olacak */
  total_barcodes_in_po: number
  items: Array<{
    id: string
    barcode: string
    serial_number: string
    production_order_number?: string | null
  }>
  /** Aynı üretim emrinde daha önce sevk edilmiş kartlar (barkod, sevk tarihi, ürün adı, konfigürasyon) */
  already_shipped?: Array<{
    barcode: string
    shipment_date: string
    product_name: string
    product_sku?: string | null
    configuration?: string | null
  }>
}

type ReadyItemUpdateInput = {
  barcode?: string
  customer_id?: string
  ready?: boolean
}

/** Türkçe karakterleri normalize ederek cari ismiyle eşleştirir (ÖZKARDEŞLER = OZKARDESLER vb.) */
function findAccountByNormalizedName(db: ReturnType<typeof getDatabase>, name: string): { id: string } | undefined {
  const n = (s: string) =>
    (s || '')
      .trim()
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/i/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
  const needle = n(name)
  if (!needle) return undefined
  const rows = db.prepare('SELECT id, name FROM accounts WHERE deleted_at IS NULL').all() as { id: string; name: string }[]
  const found = rows.find((r) => n(r.name) === needle)
  return found ? { id: found.id } : undefined
}

// GET: Müşteriye ait sevk edilebilir ürünleri getir (customer_id yoksa tümünü getir)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    let customerId = searchParams.get('customer_id')?.trim() ?? null
    const barcode = searchParams.get('barcode')

    const db = getDatabase()
    // customer_id kod (MUS-001 vb.) ise id'ye çevir
    if (customerId && /^[A-Za-z]+-\d+$/.test(customerId)) {
      const byCode = db.prepare('SELECT id FROM accounts WHERE code = ? AND deleted_at IS NULL').get(customerId) as { id: string } | undefined
      if (byCode) customerId = byCode.id
    }

    if (barcode) {
      const item = db.prepare(`
        SELECT 
          psn.*,
          p.name as product_name,
          p.sku as product_sku,
          po.order_number as production_order_number,
          a.name as customer_name,
          a.code as customer_code
        FROM product_serial_numbers psn
        JOIN active_products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN accounts a ON psn.customer_id = a.id
        WHERE (psn.barcode = ? OR psn.serial_number = ?)
          AND psn.ready_for_shipment = 1
          AND (psn.status = 'in_stock' OR psn.status = 'available' OR psn.status IS NULL OR psn.status = '')
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        LIMIT 1
      `).get(barcode, barcode) as ReadyItemRow | undefined

      if (!item) {
        return fail('Sevke hazır ürün bulunamadı', { status: 404 })
      }

      // Barkodta cari yoksa: sipariş (orders) veya satış siparişi (sales_orders) üzerinden cariyi bul
      let suggested_customer_id: string | null = item.customer_id
      if (!suggested_customer_id && item.production_order_id) {
        const poId = item.production_order_id
        const orderRow = db.prepare(`
          SELECT customer_code, dealer_name, customer_name FROM orders WHERE production_order_id = ? AND deleted_at IS NULL LIMIT 1
        `).get(poId) as { customer_code: string | null; dealer_name: string | null; customer_name?: string | null } | undefined
        if (orderRow) {
          const code = (orderRow.customer_code || '').trim()
          const nameDealer = (orderRow.dealer_name || '').trim()
          const nameCustomer = (orderRow.customer_name || '').trim()
          let acc = code
            ? db.prepare('SELECT id FROM accounts WHERE code = ? AND deleted_at IS NULL').get(code) as { id: string } | undefined
            : null
          if (!acc && nameDealer) {
            acc = db.prepare('SELECT id FROM accounts WHERE TRIM(name) = ? AND deleted_at IS NULL').get(nameDealer) as { id: string } | undefined
            if (!acc) acc = db.prepare('SELECT id FROM accounts WHERE LOWER(TRIM(name)) = ? AND deleted_at IS NULL').get(nameDealer.toLowerCase()) as { id: string } | undefined
            if (!acc) acc = findAccountByNormalizedName(db, nameDealer)
          }
          if (!acc && nameCustomer) {
            acc = db.prepare('SELECT id FROM accounts WHERE TRIM(name) = ? AND deleted_at IS NULL').get(nameCustomer) as { id: string } | undefined
            if (!acc) acc = db.prepare('SELECT id FROM accounts WHERE LOWER(TRIM(name)) = ? AND deleted_at IS NULL').get(nameCustomer.toLowerCase()) as { id: string } | undefined
            if (!acc) acc = findAccountByNormalizedName(db, nameCustomer)
          }
          suggested_customer_id = acc?.id ?? null
        }
        if (!suggested_customer_id && poId) {
          const salesRow = db.prepare(`
            SELECT so.customer_id FROM sales_order_items soi
            JOIN sales_orders so ON so.id = soi.sales_order_id AND so.deleted_at IS NULL
            WHERE soi.production_order_id = ? LIMIT 1
          `).get(poId) as { customer_id: string | null } | undefined
          if (salesRow?.customer_id) {
            const exists = db.prepare('SELECT id FROM accounts WHERE id = ? AND deleted_at IS NULL').get(salesRow.customer_id) as { id: string } | undefined
            if (exists) suggested_customer_id = salesRow.customer_id
          }
        }
        // Siparişte production_order_id dolu değilse: üretim emri order_number ile eşleştir
        if (!suggested_customer_id && poId) {
          const poNumber = db.prepare('SELECT order_number FROM production_orders WHERE id = ?').get(poId) as { order_number: string } | undefined
          if (poNumber?.order_number) {
            const orderByNumber = db.prepare(`
              SELECT customer_code, dealer_name, customer_name FROM orders WHERE order_number = ? AND deleted_at IS NULL LIMIT 1
            `).get(poNumber.order_number) as { customer_code: string | null; dealer_name: string | null; customer_name?: string | null } | undefined
            if (orderByNumber) {
              const code = (orderByNumber.customer_code || '').trim()
              const nameDealer = (orderByNumber.dealer_name || '').trim()
              const nameCustomer = (orderByNumber.customer_name || '').trim()
              let acc = code ? db.prepare('SELECT id FROM accounts WHERE code = ? AND deleted_at IS NULL').get(code) as { id: string } | undefined : null
              if (!acc && nameDealer) {
                acc = db.prepare('SELECT id FROM accounts WHERE (TRIM(name) = ? OR LOWER(TRIM(name)) = ?) AND deleted_at IS NULL').get(nameDealer, nameDealer.toLowerCase()) as { id: string } | undefined
                if (!acc) acc = findAccountByNormalizedName(db, nameDealer)
              }
              if (!acc && nameCustomer) {
                acc = db.prepare('SELECT id FROM accounts WHERE (TRIM(name) = ? OR LOWER(TRIM(name)) = ?) AND deleted_at IS NULL').get(nameCustomer, nameCustomer.toLowerCase()) as { id: string } | undefined
                if (!acc) acc = findAccountByNormalizedName(db, nameCustomer)
              }
              if (acc) suggested_customer_id = acc.id
            }
          }
        }
      }
      const resolvedCustomerId = item.customer_id ?? suggested_customer_id
      // Barkod kaydında cari yoktu ama sipariş/satıştan bulduysak bir sonraki okutmada doğrudan kullanılsın diye kaydet
      if (resolvedCustomerId && !item.customer_id && item.id) {
        try {
          db.prepare('UPDATE product_serial_numbers SET customer_id = ? WHERE id = ?').run(resolvedCustomerId, item.id)
        } catch (_) {
          // Güncelleme başarısız olsa da yanıt dönüyoruz
        }
      }
      return ok({
        item: {
          ...item,
          customer_id: resolvedCustomerId,
        },
        suggested_customer_id: suggested_customer_id ?? item.customer_id ?? undefined,
      })
    }

    let readyItems: ReadyItemRow[]
    
    if (customerId) {
      // Belirli bir müşteri için (psn.production_order_id gruplama için gerekli)
      readyItems = db.prepare(`
        SELECT 
          psn.id, psn.product_id, psn.production_order_id, psn.barcode, psn.serial_number,
          psn.status, psn.ready_for_shipment, psn.shipment_id, psn.customer_id, psn.created_at,
          p.name as product_name,
          p.sku as product_sku,
          po.order_number as production_order_number,
          a.name as customer_name,
          a.code as customer_code
        FROM product_serial_numbers psn
        JOIN active_products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN accounts a ON psn.customer_id = a.id
        WHERE psn.ready_for_shipment = 1
          AND (psn.status = 'in_stock' OR psn.status = 'available' OR psn.status IS NULL OR psn.status = '')
          AND (psn.customer_id = ? OR psn.customer_id IS NULL)
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        ORDER BY psn.customer_id = ? DESC, p.sku ASC, psn.created_at ASC
      `).all(customerId, customerId) as ReadyItemRow[]
    } else {
      // Tüm müşteriler için (müşteriye göre grupla)
      readyItems = db.prepare(`
        SELECT 
          psn.id, psn.product_id, psn.production_order_id, psn.barcode, psn.serial_number,
          psn.status, psn.ready_for_shipment, psn.shipment_id, psn.customer_id, psn.created_at,
          p.name as product_name,
          p.sku as product_sku,
          po.order_number as production_order_number,
          a.name as customer_name,
          a.code as customer_code
        FROM product_serial_numbers psn
        JOIN active_products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN accounts a ON psn.customer_id = a.id
        WHERE psn.ready_for_shipment = 1
          AND (psn.status = 'in_stock' OR psn.status = 'available' OR psn.status IS NULL OR psn.status = '')
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        ORDER BY COALESCE(psn.customer_id, 'no-customer'), p.sku ASC, psn.created_at ASC
      `).all() as ReadyItemRow[]
    }

    if (customerId) {
      // Üretim emri bazında grupla: aynı (product_id, production_order_id) = bir kart; required_count = o emirdeki toplam barkod
      const countInPoStmt = db.prepare(`
        SELECT COUNT(*) as cnt FROM product_serial_numbers
        WHERE product_id = ? AND (COALESCE(production_order_id, '') = COALESCE(?, ''))
      `)
      const groupedByProductAndPo = readyItems.reduce<Record<string, ReadyItemsGrouped>>((acc, item) => {
        const poId = item.production_order_id ?? ''
        const key = `${item.product_id}\n${poId}`
        if (!acc[key]) {
          const totalInPo = (countInPoStmt.get(item.product_id, item.production_order_id) as { cnt: number }).cnt
          acc[key] = {
            product_id: item.product_id,
            production_order_id: item.production_order_id,
            production_order_number: item.production_order_number,
            product_name: item.product_name,
            product_sku: item.product_sku,
            total_count: 0,
            total_barcodes_in_po: totalInPo,
            items: [],
          }
        }
        acc[key].total_count++
        acc[key].items.push({
          id: item.id,
          barcode: item.barcode,
          serial_number: item.serial_number,
          production_order_number: item.production_order_number,
        })
        return acc
      }, {})

      // Aynı üretim emrinde daha önce sevk edilmiş kartları getir (sevk tarihi, barkod, ürün adı, konfigürasyon)
      const alreadyShippedStmt = db.prepare(`
        SELECT 
          psn.barcode,
          s.shipment_date,
          p.name as product_name,
          p.sku as product_sku,
          o.configuration
        FROM product_serial_numbers psn
        JOIN shipments s ON psn.shipment_id = s.id AND s.deleted_at IS NULL
        JOIN active_products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN active_orders o ON po.id = o.production_order_id
        WHERE psn.product_id = ? AND (COALESCE(psn.production_order_id, '') = COALESCE(?, ''))
          AND (psn.shipment_id IS NOT NULL AND psn.shipment_id != '')
        ORDER BY s.shipment_date DESC
      `)
      const groups = Object.values(groupedByProductAndPo)
      for (const g of groups) {
        const rows = alreadyShippedStmt.all(g.product_id, g.production_order_id) as Array<{
          barcode: string
          shipment_date: string
          product_name: string
          product_sku?: string | null
          configuration?: string | null
        }>
        g.already_shipped = rows.length > 0 ? rows : undefined
      }

      return ok({
        items: groups,
        total_items: readyItems.length,
      })
    } else {
      // Tüm müşteriler için - ham veriyi döndür (frontend'de grupla)
      return ok({
        items: readyItems,
        total_items: readyItems.length,
      })
    }
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// POST: �Srünü sevk edilebilir olarak işaretle
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as ReadyItemUpdateInput
    const { barcode, customer_id, ready } = body

    if (!barcode) {
      return fail('Barkod gerekli', { status: 400 })
    }

    const db = getDatabase()

    // Barkod ile ürünü bul
    const product = db.prepare(`
      SELECT * FROM product_serial_numbers 
      WHERE barcode = ? OR serial_number = ?
    `).get(barcode, barcode) as ReadyItemRow | undefined

    if (!product) {
      return fail('Barkod bulunamadı', { status: 404 })
    }

    // Sevk edilebilir durumunu güncelle
    const readyValue = ready ? 1 : 0
    const customerIdValue = ready && customer_id ? customer_id : null

    // updated_at kolonu varsa güncelle, yoksa sadece diğer alanları güncelle
    // Ayrıca status'u 'available' yap (sevk edilebilir olması için)
    try {
      db.prepare(`
        UPDATE product_serial_numbers
        SET ready_for_shipment = ?,
            customer_id = COALESCE(?, customer_id),
            status = CASE WHEN ? = 1 THEN 'available' ELSE status END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(readyValue, customerIdValue, readyValue, product.id)
    } catch (e: any) {
      // updated_at kolonu yoksa, sadece diğer alanları güncelle
      if (e.message?.includes('no such column: updated_at')) {
        db.prepare(`
          UPDATE product_serial_numbers
          SET ready_for_shipment = ?,
              customer_id = COALESCE(?, customer_id),
              status = CASE WHEN ? = 1 THEN 'available' ELSE status END
          WHERE id = ?
        `).run(readyValue, customerIdValue, readyValue, product.id)
      } else {
        throw e
      }
    }

    return ok(null, {
      message: ready ? '�Srün sevk edilebilir olarak işaretlendi' : 'İşaret kaldırıldı',
    })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})


