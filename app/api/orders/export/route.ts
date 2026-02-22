import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { EXPORT_MAX_LIMIT } from '@/lib/constants'
import { getExportLimits, applyExportRowLimit } from '@/lib/auth/export-limits'
import { fail } from '@/lib/api/response'
import * as XLSX from 'xlsx'

// GET: Siparişleri Excel formatında export et (filtreler: status, search)
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role?: string }) => {
  try {
    const db = getDatabase()
    const limits = getExportLimits(db, user.userId, user.role)
    if (!limits.canExport) {
      return fail('Dışa aktarma yetkiniz yok. Yönetici ile iletişime geçin.', { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')?.trim() || ''
    const searchParam = searchParams.get('search')?.trim() || ''
    const deliveryWeek = searchParams.get('delivery_week') === '1'
    const overdue = searchParams.get('overdue') === '1'

    let whereClause = ' WHERE o.company_id = ? AND (o.branch_id = ? OR o.branch_id IS NULL OR o.branch_id = \'\')'
    const params: unknown[] = [DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID]

    if (statusParam && statusParam !== 'all' && !deliveryWeek && !overdue) {
      const statusValue = statusParam === 'shipped' ? 'completed' : statusParam
      whereClause += ' AND o.status = ?'
      params.push(statusValue)
    }

    if (deliveryWeek) {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() + toMonday)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      whereClause += ' AND o.delivery_date IS NOT NULL AND o.delivery_date != \'\' AND date(o.delivery_date) >= ? AND date(o.delivery_date) <= ?'
      params.push(weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0])
    }
    if (overdue) {
      const today = new Date().toISOString().split('T')[0]
      whereClause += ' AND o.delivery_date IS NOT NULL AND o.delivery_date != \'\' AND date(o.delivery_date) < ? AND o.status NOT IN (\'completed\', \'cancelled\')'
      params.push(today)
    }

    if (searchParam) {
      const likeTerm = `%${searchParam}%`
      whereClause += ` AND (
        o.order_number LIKE ? OR o.dealer_name LIKE ? OR o.customer_name LIKE ? OR
        o.product_name LIKE ? OR o.product_sku LIKE ?
      )`
      params.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm)
    }

    const requestedLimit = Math.min(EXPORT_MAX_LIMIT, parseInt(searchParams.get('limit') || String(EXPORT_MAX_LIMIT), 10) || EXPORT_MAX_LIMIT)
    const limit = applyExportRowLimit(requestedLimit, limits, EXPORT_MAX_LIMIT)
    const orders = db.prepare(`
      SELECT 
        o.order_number as "Takip No",
        o.dealer_name as "Cari Adı",
        o.customer_name as "Müşteri Adı",
        o.customer_code as "Müşteri Kodu",
        o.product_name as "Ürün Adı",
        o.product_sku as "SKU",
        o.quantity as "Miktar",
        o.unit_price as "Birim Fiyat",
        o.total_amount as "Toplam Tutar",
        o.order_date as "Sipariş Tarihi",
        o.configuration as "Konfigürasyon",
        o.delivery_date as "Teslim Tarihi",
        o.status as "Durum",
        o.notes as "Notlar",
        o.created_at as "Oluşturulma"
      FROM active_orders o
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ?
    `).all(...params, limit) as any[]
    
// Notlar alanından kumaş, kasa, ayak, birim bilgilerini çıkar
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return ''
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return ''
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear()
        return `${day}.${month}.${year}`
      } catch {
        return dateStr
      }
    }
    const statusLabel: Record<string, string> = {
      pending: 'Beklemede',
      in_production: 'Üretimde',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
    }
    const processedOrders = orders.map((order: Record<string, unknown>) => {
      const notes = String(order['Notlar'] ?? '')
      let fabricCode = ''
      const fabricMatch = notes.match(/Kumaş:\s*([^|]+)/i)
      if (fabricMatch) fabricCode = fabricMatch[1].trim()
      let caseInfo = ''
      const caseMatch = notes.match(/Kasa:\s*([^|]+)/i)
      if (caseMatch) caseInfo = caseMatch[1].trim()
      let legInfo = ''
      const legMatch = notes.match(/Ayak:\s*([^|]+)/i)
      if (legMatch) legInfo = legMatch[1].trim()
      let unit = ''
      const unitMatch = notes.match(/Birim:\s*([^|]+)/i)
      if (unitMatch) unit = unitMatch[1].trim()
      const cleanNotes = notes
        .replace(/Kumaş:\s*[^|]+/gi, '')
        .replace(/Kasa:\s*[^|]+/gi, '')
        .replace(/Ayak:\s*[^|]+/gi, '')
        .replace(/Birim:\s*[^|]+/gi, '')
        .replace(/\|\s*/g, '')
        .trim() || ''
      return {
        'Takip No': order['Takip No'] ?? '',
        'Cari Adı': order['Cari Adı'] ?? '',
        'Müşteri Adı': order['Müşteri Adı'] ?? '',
        'Müşteri Kodu': order['Müşteri Kodu'] ?? '',
        'Ürün Adı': order['Ürün Adı'] ?? '',
        'SKU': order['SKU'] ?? '',
        'Miktar': order['Miktar'] ?? 0,
        'Birim Fiyat': order['Birim Fiyat'] ?? 0,
        'Toplam Tutar': order['Toplam Tutar'] ?? 0,
        'Sipariş Tarihi': formatDate(order['Sipariş Tarihi'] as string),
        'Konfigürasyon': order['Konfigürasyon'] ?? '',
        'Kumaş Kodu': fabricCode,
        'Kasa': caseInfo,
        'Ayak': legInfo,
        'Birim': unit,
        'Teslim Tarihi': formatDate(order['Teslim Tarihi'] as string),
        'Durum': statusLabel[String(order['Durum'] ?? '')] ?? order['Durum'],
        'Notlar': cleanNotes,
        'Oluşturulma': formatDate(order['Oluşturulma'] as string),
      }
    })
    
    // Excel workbook oluştur
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(processedOrders)
    
    worksheet['!cols'] = [
      { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 26 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 32 }, { wch: 12 },
    ]
    
    // Worksheet'i workbook'a ekle
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Siparişler')
    
    // Excel dosyasını buffer olarak oluştur
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    // Response olarak döndür
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Siparisler_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })
  } catch (error: any) {
    const { apiLogger } = await import('@/lib/api/logger')
    apiLogger.error('Orders export failed', { error: error?.message, stack: error?.stack })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})







