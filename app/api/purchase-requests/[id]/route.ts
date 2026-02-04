import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { logAudit as logAuditEntry } from '@/lib/audit/logger'

// PATCH: Satın alma talebi durumunu güncelle
export const PATCH = withAuth(async (
  request: NextRequest, user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params
    )
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const body = await parseJsonBody(request)
    const { status, requested_quantity, unit_price, supplier_name } = body

    const db = getDatabase()

    // Talebi bul
    const request_record = db.prepare('SELECT * FROM purchase_requests WHERE id = ? AND deleted_at IS NULL').get(resolvedParams.id) as any
    if (!request_record) {
      return NextResponse.json({ error: 'Satın alma talebi bulunamadı' }, { status: 404 })
    }

    // Güncelleme sorgusu oluştur
    let updateQuery = 'UPDATE purchase_requests SET updated_at = CURRENT_TIMESTAMP'
    const updateParams: any[] = []

    if (status !== undefined) {
      const validStatuses = ['draft', 'ordered', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Geçersiz status. Geçerli değerler: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateQuery += ', status = ?'
      updateParams.push(status)
    }

    if (requested_quantity !== undefined) {
      if (requested_quantity <= 0) {
        return NextResponse.json(
          { error: 'Miktar pozitif bir değer olmalıdır' },
          { status: 400 }
        )
      }
      updateQuery += ', requested_quantity = ?'
      updateParams.push(requested_quantity)
    }

    if (unit_price !== undefined) {
      if (unit_price < 0) {
        return NextResponse.json(
          { error: 'Birim fiyat negatif olamaz' },
          { status: 400 }
        )
      }
      updateQuery += ', unit_price = ?'
      updateParams.push(unit_price)
    }

    if (supplier_name !== undefined) {
      updateQuery += ', supplier_name = ?'
      updateParams.push(supplier_name || null)
    }

    // Eğer miktar veya birim fiyat güncelleniyorsa, toplam tutarı yeniden hesapla
    if (requested_quantity !== undefined || unit_price !== undefined) {
      const finalQuantity = requested_quantity !== undefined ? requested_quantity : request_record.requested_quantity
      const finalPrice = unit_price !== undefined ? unit_price : request_record.unit_price
      const totalAmount = finalQuantity * finalPrice
      updateQuery += ', total_amount = ?'
      updateParams.push(totalAmount)
    }

    updateQuery += ' WHERE id = ? AND deleted_at IS NULL'
    updateParams.push(resolvedParams.id)

    db.prepare(updateQuery).run(...updateParams)

    const updated = db.prepare('SELECT * FROM purchase_requests WHERE id = ? AND deleted_at IS NULL').get(resolvedParams.id)

    return NextResponse.json({
      success: true,
      request: updated,
      message: 'Satın alma talebi güncellendi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Satın alma talebini sil
export const DELETE = withAuth(async (
  request: NextRequest, user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params
    )
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()

    // Talebi bul
    const request_record = db.prepare('SELECT * FROM purchase_requests WHERE id = ? AND deleted_at IS NULL').get(resolvedParams.id) as any
    if (!request_record) {
      return NextResponse.json({ error: 'Satın alma talebi bulunamadı' }, { status: 404 })
    }

    // Talebi pasife al
    db.prepare('UPDATE purchase_requests SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL')
      .run(resolvedParams.id)

    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || undefined

    logAuditEntry({
      table: 'purchase_requests',
      recordId: resolvedParams.id,
      action: 'DELETE',
      oldData: request_record,
      newData: null,
      userId: user.userId,
      ipAddress,
    })

    return NextResponse.json({
      success: true,
      message: 'Satın alma talebi silindi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

