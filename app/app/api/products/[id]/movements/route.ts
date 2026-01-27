import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Belirli bir ürünün stok hareket geçmişi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const db = getDatabase()

    const movements = db.prepare(`
      SELECT 
        id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_at
      FROM stock_movements
      WHERE product_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(resolvedParams.id) as any[]

    // Tarih formatını düzenle
    const formattedMovements = movements.map((movement) => {
      const date = new Date(movement.created_at)
      return {
        ...movement,
        date: date.toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
        time: date.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        datetime: date.toLocaleString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      }
    })

    return NextResponse.json({
      movements: formattedMovements,
      total: movements.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

