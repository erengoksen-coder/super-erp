import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Fatura detayı
export const GET = withAuth(
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ id: string }> | { id: string } }
  ) => {
    try {
    const resolvedParams = await Promise.resolve(params)
    const db = getDatabase()
    const invoice = db.prepare(`
      SELECT i.*, a.name as customer_name, a.code as customer_code, s.shipment_number
      FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE i.id = ? AND i.deleted_at IS NULL
    `).get(resolvedParams.id) as any

    if (!invoice) {
      return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
    }

    const items = db.prepare(`
      SELECT ii.*, p.name as product_name, p.sku as product_sku
      FROM invoice_items ii
      JOIN active_products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ? AND ii.deleted_at IS NULL
      ORDER BY ii.created_at
    `).all(resolvedParams.id)

    return NextResponse.json({ ...invoice, items })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
)

// DELETE: Faturayı iptal et (soft delete)
export const DELETE = withAuth(
  async (
    request: NextRequest,
    user,
    { params }: { params: Promise<{ id: string }> | { id: string } }
  ) => {
    try {
    const resolvedParams = await Promise.resolve(params)
    const db = getDatabase()
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND deleted_at IS NULL').get(resolvedParams.id) as any
    if (!invoice) {
      return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE invoices
        SET status = 'cancelled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(resolvedParams.id)

      db.prepare(`
        UPDATE invoice_items
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE invoice_id = ?
      `).run(resolvedParams.id)
    })()

    return NextResponse.json({ success: true })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
)
