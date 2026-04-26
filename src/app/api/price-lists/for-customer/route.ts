import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

// GET: Müşteriye göre geçerli fiyat listesi (müşteri grubu bazlı)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    if (!customerId) return fail('customer_id gerekli', { status: 400 })

    const db = getDatabase()
    const account = db.prepare('SELECT id, customer_group_id FROM accounts WHERE id = ? AND deleted_at IS NULL').get(customerId) as { id: string; customer_group_id: string | null } | undefined
    if (!account) return fail('Müşteri bulunamadı', { status: 404 })

    const priceListQuery = account.customer_group_id
      ? `SELECT * FROM price_lists WHERE customer_group_id = ? AND deleted_at IS NULL AND status = 'active' ORDER BY is_default DESC LIMIT 1`
      : `SELECT * FROM price_lists WHERE (customer_group_id IS NULL OR customer_group_id = '') AND deleted_at IS NULL AND status = 'active' ORDER BY is_default DESC, name ASC LIMIT 1`
    const priceListParams = account.customer_group_id ? [account.customer_group_id] : []
    const priceList = db.prepare(priceListQuery).get(...priceListParams) as any

    // SQL: Ürünlerin hem fiyat listesindeki hem de BOM'daki maliyetlerini getiren akıllı sorgu
    const sql = `
      SELECT 
        p.id as product_id, 
        p.name as current_product_name, 
        p.sku, 
        p.selling_price as default_price,
        pli.unit_price as list_price,
        pli.discount_rate as list_discount,
        (SELECT SUM(m.unit_price * (b.quantity_required * (1 + (COALESCE(b.waste_percentage, 0) / 100.0)))) 
         FROM bom b 
         JOIN materials m ON m.id = b.material_id 
         JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
         WHERE b.product_id = p.id AND b.deleted_at IS NULL) as bom_cost
      FROM products p
      LEFT JOIN price_list_items pli ON p.id = pli.product_id AND pli.price_list_id = ?
      WHERE p.deleted_at IS NULL
      ORDER BY p.name ASC
    `
    const results = db.prepare(sql).all(priceList?.id || '') as any[]

    const items = results.map(row => {
      // Eğer fiyat listesinde ürün varsa list_price'ı kullan, yoksa BOM_cost'u kullan (o da yoksa default_price)
      let finalPrice = row.list_price || row.bom_cost || row.default_price || 0

      return {
        id: row.product_id,
        product_id: row.product_id,
        product_name: row.current_product_name,
        product_sku: row.sku,
        unit_price: finalPrice,
        discount_rate: row.list_discount || 0,
        sku: row.sku,
        is_from_bom: !row.list_price && !!row.bom_cost
      }
    })

    return ok({
      price_list: priceList || { id: 'bom_fallback', name: 'BOM Tabanlı Fiyatlandırma' },
      items
    })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
