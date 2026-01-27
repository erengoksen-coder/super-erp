import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Kritik seviyenin altına düşen malzemeleri getir
export async function GET() {
  try {
    const db = getDatabase()
    
    // Kritik seviyenin altına düşen malzemeleri getir
    const criticalMaterials = db.prepare(`
      SELECT 
        m.*,
        a.name as supplier_name,
        a.code as supplier_code,
        a.phone as supplier_phone,
        a.email as supplier_email,
        CASE 
          WHEN m.stock_amount <= 0 THEN m.min_stock_level * 2
          WHEN m.stock_amount < m.min_stock_level THEN m.min_stock_level * 1.5 - m.stock_amount
          ELSE 0
        END as suggested_quantity,
        (m.min_stock_level - m.stock_amount) as shortage
      FROM materials m
      LEFT JOIN accounts a ON m.supplier_id = a.id
      WHERE m.stock_amount < m.min_stock_level
      ORDER BY (m.min_stock_level - m.stock_amount) DESC, m.name ASC
    `).all()

    return NextResponse.json(criticalMaterials)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

