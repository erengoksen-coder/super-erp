import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { apiLogger } from '@/lib/api/logger'
import * as XLSX from 'xlsx'

// GET: Kritik stok listesini Excel olarak indir
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const neededByMaterial = db.prepare(`
      SELECT b.material_id,
        COALESCE(SUM(o.quantity * b.quantity_required * (1 + COALESCE(b.fire_percentage, 0) / 100)), 0) as needed_for_orders
      FROM orders o
      JOIN bom b ON b.product_id = o.product_id AND b.deleted_at IS NULL
      JOIN bom_versions bv ON bv.id = b.version_id AND bv.is_active = 1 AND (bv.deleted_at IS NULL OR bv.deleted_at = '')
      WHERE o.deleted_at IS NULL AND o.status IN ('pending', 'in_production')
      GROUP BY b.material_id
    `).all() as Array<{ material_id: string; needed_for_orders: number }>
    const neededMap = new Map(neededByMaterial.map((r) => [r.material_id, r.needed_for_orders]))

    const rows = db.prepare(`
      SELECT m.id, m.code, m.name, m.category, m.unit, m.min_stock_level, m.unit_price, m.purchase_price,
        m.last_purchase_date, COALESCE(m.stock_amount, 0) as stock_amount, a.name as supplier_name,
        (m.min_stock_level - COALESCE(m.stock_amount, 0)) as shortage
      FROM materials m
      LEFT JOIN accounts a ON m.supplier_id = a.id
      WHERE m.deleted_at IS NULL AND m.min_stock_level IS NOT NULL
        AND (m.stock_amount IS NULL OR m.stock_amount < m.min_stock_level)
      ORDER BY (m.min_stock_level - COALESCE(m.stock_amount, 0)) DESC, m.name ASC
    `).all() as Array<{
      id: string
      code: string
      name: string
      category: string
      unit: string
      min_stock_level: number
      unit_price: number
      purchase_price: number
      last_purchase_date: string | null
      stock_amount: number
      supplier_name: string | null
      shortage: number
    }>

    const data = rows.map((r) => {
      const shortage = Number(r.shortage)
      const needed = neededMap.get(r.id) ?? 0
      const suggested = Math.max(shortage, needed)
      const totalAmount = suggested * (r.purchase_price ?? 0)
      return {
        Kod: r.code ?? '',
        Malzeme: r.name ?? '',
        Kategori: r.category ?? '',
        Birim: r.unit ?? '',
        'Mevcut Stok': r.stock_amount,
        'Min. Seviye': r.min_stock_level,
        Eksik: shortage,
        'Önerilen Miktar': Math.ceil(suggested),
        'Birim Fiyat': r.purchase_price ?? r.unit_price ?? 0,
        'Tahmini Tutar': totalAmount,
        Tedarikçi: r.supplier_name ?? '',
        'Son Alış': r.last_purchase_date ?? '',
      }
    })

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet['!cols'] = [
      { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kritik Stok')
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Kritik_Stok_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Excel alınamadı'
    apiLogger.error('Critical stock export failed', { error: message })
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
})
