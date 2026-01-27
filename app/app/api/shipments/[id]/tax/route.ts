import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// PATCH: Sevkiyat KDV oranını güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const shipmentId = resolvedParams.id
    const body = await request.json()
    const { tax_rate } = body

    if (tax_rate === undefined || tax_rate < 0 || tax_rate > 100) {
      return NextResponse.json(
        { error: 'KDV oranı 0-100 arasında olmalıdır' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Sevkiyatı bul
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipmentId) as any
    if (!shipment) {
      return NextResponse.json({ error: 'Sevkiyat bulunamadı' }, { status: 404 })
    }

    // KDV hesapla
    const totalAmount = shipment.total_amount || 0
    const newTaxRate = parseFloat(tax_rate.toString())
    const newTaxAmount = (totalAmount * newTaxRate) / 100
    const newFinalAmount = totalAmount + newTaxAmount

    // Eski ve yeni farkı hesapla (cari hesap bakiyesi için)
    const oldFinalAmount = shipment.final_amount || shipment.total_amount || 0
    const balanceDifference = newFinalAmount - oldFinalAmount

    db.transaction(() => {
      // Sevkiyat KDV bilgilerini güncelle
      db.prepare(`
        UPDATE shipments
        SET tax_rate = ?,
            tax_amount = ?,
            final_amount = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newTaxRate, newTaxAmount, newFinalAmount, shipmentId)

      // Müşteri cari hesap bakiyesini güncelle
      if (balanceDifference !== 0) {
        db.prepare(`
          UPDATE accounts
          SET balance = balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(balanceDifference, shipment.customer_id)
      }
    })()

    return NextResponse.json({
      success: true,
      message: 'KDV başarıyla güncellendi',
      shipment: {
        ...shipment,
        tax_rate: newTaxRate,
        tax_amount: newTaxAmount,
        final_amount: newFinalAmount,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

