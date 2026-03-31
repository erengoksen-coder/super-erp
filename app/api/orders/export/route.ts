import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { EXPORT_MAX_LIMIT } from '@/lib/constants'
import * as XLSX from 'xlsx'

// GET: Siparişleri Excel formatında export et (filtreler: status, search)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')?.trim() || ''
    const searchParam = searchParams.get('search')?.trim() || ''

    const db = getDatabase()

    let whereClause = ' WHERE 1=1'
    const params: unknown[] = []

    if (statusParam && statusParam !== 'all') {
      const statusValue = statusParam === 'shipped' ? 'completed' : statusParam
      whereClause += ' AND o.status = ?'
      params.push(statusValue)
    }

    if (searchParam) {
      const likeTerm = `%${searchParam}%`
      whereClause += ` AND (
        o.order_number LIKE ? OR o.dealer_name LIKE ? OR o.customer_name LIKE ? OR
        o.product_name LIKE ? OR o.product_sku LIKE ?
      )`
      params.push(likeTerm, likeTerm, likeTerm, likeTerm, likeTerm)
    }

    const limit = Math.min(EXPORT_MAX_LIMIT, parseInt(searchParams.get('limit') || String(EXPORT_MAX_LIMIT), 10) || EXPORT_MAX_LIMIT)
    const orders = db.prepare(`
      SELECT 
        o.order_number as "TAKİP NO",
        o.dealer_name as "CARİ ADI",
        o.customer_name as "MÜŞTERİ ADI",
        o.customer_code as "Müşteri Kodu",
        o.product_name as "ÜRÜN ADI",
        o.product_sku as "SKU",
        o.quantity as "SİP MİKTAR",
        o.unit_price as "Birim Fiyat",
        o.total_amount as "Toplam Tutar",
        o.order_date as "SİP TRH",
        o.configuration as "KONFİGÜRASYON",
        o.delivery_date as "Teslim Tarihi",
        o.status as "Durum",
        o.notes as "AÇIKLAMA",
        o.created_at as "Oluşturulma Tarihi"
      FROM active_orders o
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ?
    `).all(...params, limit) as any[]
    
    // Notlar alanından kumaş, kasa, ayak, birim bilgilerini çıkar
    const processedOrders = orders.map(order => {
      const notes = order.AÇIKLAMA || ''
      let fabricCode = ''
      let caseInfo = ''
      let legInfo = ''
      let unit = ''
      
      // Kumaş bilgisini çıkar
      const fabricMatch = notes.match(/Kumaş:\s*([^|]+)/i)
      if (fabricMatch) {
        fabricCode = fabricMatch[1].trim()
      }
      
      // Kasa bilgisini çıkar
      const caseMatch = notes.match(/Kasa:\s*([^|]+)/i)
      if (caseMatch) {
        caseInfo = caseMatch[1].trim()
      }
      
      // Ayak bilgisini çıkar
      const legMatch = notes.match(/Ayak:\s*([^|]+)/i)
      if (legMatch) {
        legInfo = legMatch[1].trim()
      }
      
      // Birim bilgisini çıkar
      const unitMatch = notes.match(/Birim:\s*([^|]+)/i)
      if (unitMatch) {
        unit = unitMatch[1].trim()
      }
      
      // Tarih formatını düzenle
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
      
      return {
        'TAKİP NO': order['TAKİP NO'] || '',
        'CARİ ADI': order['CARİ ADI'] || '',
        'MÜŞTERİ ADI': order['MÜŞTERİ ADI'] || '',
        'Müşteri Kodu': order['Müşteri Kodu'] || '',
        'ÜRÜN ADI': order['ÜRÜN ADI'] || '',
        'SKU': order['SKU'] || '',
        'SİP MİKTAR': order['SİP MİKTAR'] || 0,
        'Birim Fiyat': order['Birim Fiyat'] || 0,
        'Toplam Tutar': order['Toplam Tutar'] || 0,
        'SİP TRH': formatDate(order['SİP TRH']),
        'KONFİGÜRASYON': order['KONFİGÜRASYON'] || '',
        'KUMAŞ KODU': fabricCode,
        'KASA': caseInfo,
        'AYAK': legInfo,
        'BRİM': unit,
        'Teslim Tarihi': formatDate(order['Teslim Tarihi']),
        'Durum': order['Durum'] === 'pending' ? 'Beklemede' : 
                 order['Durum'] === 'in_production' ? 'Üretimde' : 
                 order['Durum'] === 'completed' ? 'Tamamlandı' : 
                 order['Durum'] === 'cancelled' ? 'İptal Edildi' : order['Durum'],
        'AÇIKLAMA': notes.replace(/Kumaş:\s*[^|]+/gi, '').replace(/Kasa:\s*[^|]+/gi, '').replace(/Ayak:\s*[^|]+/gi, '').replace(/Birim:\s*[^|]+/gi, '').replace(/\|\s*/g, '').trim() || '',
        'Oluşturulma Tarihi': formatDate(order['Oluşturulma Tarihi'])
      }
    })
    
    // Excel workbook oluştur
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(processedOrders)
    
    // Kolon genişliklerini ayarla
    const columnWidths = [
      { wch: 15 }, // TAKİP NO
      { wch: 20 }, // CARİ ADI
      { wch: 20 }, // MÜŞTERİ ADI
      { wch: 15 }, // Müşteri Kodu
      { wch: 25 }, // ÜRÜN ADI
      { wch: 15 }, // SKU
      { wch: 12 }, // SİP MİKTAR
      { wch: 12 }, // Birim Fiyat
      { wch: 12 }, // Toplam Tutar
      { wch: 12 }, // SİP TRH
      { wch: 15 }, // KONFİGÜRASYON
      { wch: 15 }, // KUMAŞ KODU
      { wch: 10 }, // KASA
      { wch: 10 }, // AYAK
      { wch: 10 }, // BRİM
      { wch: 12 }, // Teslim Tarihi
      { wch: 12 }, // Durum
      { wch: 30 }, // AÇIKLAMA
      { wch: 18 }  // Oluşturulma Tarihi
    ]
    worksheet['!cols'] = columnWidths
    
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
    console.error('Excel export hatası:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})







