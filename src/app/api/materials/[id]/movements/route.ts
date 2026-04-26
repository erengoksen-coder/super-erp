import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

type StockMovementRow = {
  id: string
  movement_type: string
  quantity: number
  reference_type: string | null
  reference_id: string | null
  invoice_number: string | null
  shipment_number: string | null
  notes: string | null
  created_at: string
  user_id: string | null
  user_name: string | null
  user_username: string | null
}

type StockMovementFormatted = StockMovementRow & {
  date: string
  time: string
  datetime: string
}

// GET: Belirli bir malzemenin stok hareket geçmişi
export const GET = withAuth(async (
  request: NextRequest,
  _user,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) => {
  try {
    const resolvedParams = await Promise.resolve(context?.params)
    const materialId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).slice(-2)[0]
    if (!materialId) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()

    const movements = db.prepare(`
      SELECT 
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.invoice_number,
        sm.shipment_number,
        sm.notes,
        sm.created_at,
        sm.user_id,
        u.full_name as user_name,
        u.username as user_username
      FROM stock_movements sm
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.material_id = ?
      ORDER BY sm.created_at DESC
      LIMIT 100
    `).all(materialId) as StockMovementRow[]

    // Tarih formatını düzenle
    const formattedMovements = movements.map((movement): StockMovementFormatted => {
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
});

