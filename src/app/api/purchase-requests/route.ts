import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/utils/logger'

// GET: Tüm satın alma taleplerini getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const materialId = searchParams.get('material_id')

    const db = getDatabase()
    let query = `
      SELECT 
        pr.*,
        m.name as material_name,
        m.unit as material_unit,
        m.min_stock_level,
        m.stock_amount,
        m.code as material_code,
        pr.supplier_name,
        m.supplier_id,
        s.name as material_supplier_name
      FROM purchase_requests pr
      JOIN materials m ON pr.material_id = m.id
      LEFT JOIN accounts s ON m.supplier_id = s.id
      WHERE pr.deleted_at IS NULL
    `
    const params: any[] = []

    if (status) {
      query += ' AND pr.status = ?'
      params.push(status)
    } else {
      // Status belirtilmemişse, sadece "completed" olmayanları göster
      query += ' AND pr.status != ?'
      params.push('completed')
    }

    if (materialId) {
      query += ' AND pr.material_id = ?'
      params.push(materialId)
    }

    query += ' ORDER BY pr.created_at DESC'

    const requests = db.prepare(query).all(...params)
    return NextResponse.json(requests)
  } catch (error: any) {
    try {
      await logger.error('[Purchase Requests API] GET failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch {}
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni satın alma talebi oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { material_id, requested_quantity, unit_price, supplier_name, notes } = body

    if (!material_id || !requested_quantity || requested_quantity <= 0) {
      return NextResponse.json(
        { error: 'material_id ve requested_quantity (pozitif) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Hammadde bilgisini al
    const material = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id) as any
    if (!material) {
      return NextResponse.json({ error: 'Hammadde bulunamadı' }, { status: 404 })
    }

    // Talep numarası oluştur
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    
    // Bugünkü talep sayısını al
    const todayStr = `${year}${month}${day}`
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM purchase_requests 
      WHERE request_number LIKE ?
    `).get(`SAT-${todayStr}-%`) as any

    let sequence = (todayCount?.count || 0) + 1
    let requestNumber = `SAT-${todayStr}-${String(sequence).padStart(4, '0')}`
    
    // Unique kontrolü - eşer varsa sequence artır
    let attempts = 0
    while (attempts < 100) {
      const existing = db.prepare('SELECT id FROM purchase_requests WHERE request_number = ? AND deleted_at IS NULL').get(requestNumber) as any
      if (!existing) {
        break
      }
      sequence++
      requestNumber = `SAT-${todayStr}-${String(sequence).padStart(4, '0')}`
      attempts++
    }

    const id = randomUUID()
    const price = unit_price || 0
    const totalAmount = requested_quantity * price

    try {
      db.prepare(`
        INSERT INTO purchase_requests 
        (id, request_number, material_id, requested_quantity, unit_price, total_amount, status, supplier_name, notes)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
      `).run(id, requestNumber, material_id, requested_quantity, price, totalAmount, supplier_name || null, notes || null)

      const request = db.prepare('SELECT * FROM purchase_requests WHERE id = ? AND deleted_at IS NULL').get(id)

      return NextResponse.json({
        success: true,
        request,
        message: 'Satın alma talebi oluşturuldu',
      }, { status: 201 })
    } catch (dbError: any) {
      // Eşer unique constraint hatası varsa, request_number'ı tekrar oluştur
      if (dbError.message && dbError.message.includes('UNIQUE')) {
        sequence++
        requestNumber = `SAT-${todayStr}-${String(sequence).padStart(4, '0')}`
        
        db.prepare(`
          INSERT INTO purchase_requests 
          (id, request_number, material_id, requested_quantity, unit_price, total_amount, status, supplier_name, notes)
          VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
        `).run(id, requestNumber, material_id, requested_quantity, price, totalAmount, supplier_name || null, notes || null)

        const request = db.prepare('SELECT * FROM purchase_requests WHERE id = ?').get(id)

        return NextResponse.json({
          success: true,
          request,
          message: 'Satın alma talebi oluşturuldu',
        }, { status: 201 })
      }
      throw dbError
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


