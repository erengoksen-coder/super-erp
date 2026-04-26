import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

/**
 * Agi-OS Global Search API
 * Performs real-time search across Products, Accounts, and Production Orders.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json({ data: [] })
  }

  const db = getDatabase()
  const searchTerm = `%${query}%`

  try {
    // 1. Search Products
    const products = db.prepare(`
      SELECT id, name, code, 'Pages' as category, '/inventory' as href, 'Package' as icon
      FROM products 
      WHERE (name LIKE ? OR code LIKE ?) AND deleted_at IS NULL
      LIMIT 5
    `).all(searchTerm, searchTerm) as any[]

    // 2. Search Accounts (Cari Hesaplar)
    const accounts = db.prepare(`
      SELECT id, name, code, 'Pages' as category, '/accounts' as href, 'Users' as icon
      FROM accounts 
      WHERE (name LIKE ? OR code LIKE ?) AND deleted_at IS NULL
      LIMIT 5
    `).all(searchTerm, searchTerm) as any[]

    // 3. Search Production Orders
    const productionOrders = db.prepare(`
      SELECT id, order_number as name, status as code, 'Actions' as category, '/production' as href, 'Factory' as icon
      FROM production_orders 
      WHERE order_number LIKE ? AND deleted_at IS NULL
      LIMIT 5
    `).all(searchTerm) as any[]

    // Format all results for the Command Palette
    const results = [
      ...products.map(p => ({ ...p, id: `prod-${p.id}`, description: `Ürün Kodu: ${p.code}` })),
      ...accounts.map(a => ({ ...a, id: `acc-${a.id}`, description: `Cari Kodu: ${a.code}` })),
      ...productionOrders.map(o => ({ ...o, id: `po-${o.id}`, description: `Durum: ${o.code}` }))
    ]

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Arama sırasında hata oluştu' }, { status: 500 })
  }
}
