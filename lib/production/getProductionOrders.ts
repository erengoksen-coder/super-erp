import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'

type ProductionOrderFilters = {
  customerName?: string | null
  search?: string | null
  userId?: string | null
}

export const getProductionOrders = async (filters: ProductionOrderFilters) => {
  const db = getDatabase()
  const customerName = filters.customerName || null
  const search = filters.search || null

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
    LEFT JOIN active_products p ON po.product_id = p.id
    LEFT JOIN active_orders o ON po.id = o.production_order_id
    WHERE 1=1
  `
  const params: any[] = []
  query += ' AND po.company_id = ? AND po.branch_id = ?'
  params.push(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
  query += ' AND po.deleted_at IS NULL'

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
  return db.prepare(query).all(...params)
}
