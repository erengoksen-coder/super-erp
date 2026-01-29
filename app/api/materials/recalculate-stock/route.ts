import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// POST: Tüm malzemelerin stok miktarlarını stock_movements tablosundan yeniden hesapla
export async function POST(request: NextRequest) {
  try {
    const db = getDatabase()

    // Tüm malzemeleri al
    const materials = db.prepare('SELECT id FROM materials WHERE deleted_at IS NULL').all() as any[]

    db.transaction(() => {
      materials.forEach((material) => {
        // Her malzeme için stock_movements tablosundan toplam giriş ve çıkış hesapla
        // COALESCE kullanarak NULL değerleri 0'a çevir
        const result = db.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END), 0) as total_in,
            COALESCE(SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END), 0) as total_out
          FROM stock_movements
          WHERE material_id = ? AND material_id IS NOT NULL
        `).get(material.id) as { total_in: number; total_out: number } | undefined

        // Değerleri sayıya çevir (SQLite bazen string döndürebilir)
        const totalIn = result ? Number(result.total_in) || 0 : 0
        const totalOut = result ? Number(result.total_out) || 0 : 0

        // Yeni stok miktarını hesapla
        const calculatedStock = totalIn - totalOut

        // Stoku güncelle
        db.prepare(`
          UPDATE materials
          SET stock_amount = ?,
              reserved_quantity = CASE
                WHEN reserved_quantity > ? THEN ?
                ELSE reserved_quantity
              END,
              version = version + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(calculatedStock, calculatedStock, calculatedStock, material.id)
      })
    })()

    // Hesaplanan stokları kontrol et ve detaylı bilgi döndür
    const updatedMaterials = db.prepare(`
      SELECT 
        m.id,
        m.name,
        m.stock_amount,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END), 0) as calculated_in,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END), 0) as calculated_out
      FROM materials m
      LEFT JOIN stock_movements sm ON sm.material_id = m.id AND sm.material_id IS NOT NULL
      GROUP BY m.id, m.name, m.stock_amount
      LIMIT 10
    `).all() as any[]

    return NextResponse.json({
      success: true,
      message: 'Tüm stok miktarları başarıyla yeniden hesaplandı',
      materials_updated: materials.length,
      sample_results: updatedMaterials.map((m: any) => ({
        name: m.name,
        stock_amount: Number(m.stock_amount) || 0,
        calculated_in: Number(m.calculated_in) || 0,
        calculated_out: Number(m.calculated_out) || 0,
        calculated_stock: (Number(m.calculated_in) || 0) - (Number(m.calculated_out) || 0),
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

