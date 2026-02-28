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

    let priceList: any = null
    if (account.customer_group_id) {
      priceList = db.prepare(`
        SELECT * FROM price_lists WHERE customer_group_id = ? AND deleted_at IS NULL AND status = 'active'
        ORDER BY is_default DESC LIMIT 1
      `).get(account.customer_group_id) as any
    }
    if (!priceList) {
      priceList = db.prepare(`
        SELECT * FROM price_lists WHERE (customer_group_id IS NULL OR customer_group_id = '') AND deleted_at IS NULL AND status = 'active'
        ORDER BY is_default DESC, name ASC LIMIT 1
      `).get() as any
    }
    if (!priceList) {
      return ok({ price_list: null, items: [] })
    }

    const items = db.prepare(`
      SELECT pli.*, p.name as current_product_name, p.sku FROM price_list_items pli
      LEFT JOIN products p ON pli.product_id = p.id
      WHERE pli.price_list_id = ? ORDER BY pli.product_name
    `).all(priceList.id) as any[]
    return ok({ price_list: priceList, items })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
