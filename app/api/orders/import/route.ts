import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import * as XLSX from 'xlsx'

// Bayi isminden otomatik cari hesap oluştur (eğer yoksa)
function createAccountIfNotExists(db: any, dealerName: string | null): void {
  if (!dealerName || dealerName.trim() === '') {
    return
  }

  const trimmedName = dealerName.trim()
  
  // Aynı isimde cari hesap var mı kontrol et
  const existingAccount = db.prepare('SELECT id FROM accounts WHERE name = ? COLLATE NOCASE').get(trimmedName) as any
  
  if (existingAccount) {
    // Zaten var, oluşturma
    return
  }

  try {
    // Kod oluştur
    const lastAccount = db.prepare(`
      SELECT code FROM accounts 
      WHERE type = 'customer' 
      ORDER BY code DESC 
      LIMIT 1
    `).get() as any
    
    let codeNumber = 1
    if (lastAccount) {
      const lastNum = parseInt(lastAccount.code.replace(/[^0-9]/g, '')) || 0
      codeNumber = lastNum + 1
    }
    
    const code = `MUS-${String(codeNumber).padStart(4, '0')}`
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Cari hesap oluştur (created_by ve updated_by NULL, FOREIGN KEY constraint için)
    db.prepare(`
      INSERT INTO accounts (id, code, name, type, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, code, trimmedName, 'customer', null, null)
  } catch (error: any) {
    // Hata durumunda detaylı log
    console.error(`Cari hesap oluşturulamadı (${trimmedName}):`, {
      error: error.message,
      stack: error.stack,
      dealerName: trimmedName
    })
    // Hata olsa bile devam et (duplicate key vb. durumlar için)
  }
}

// POST: Excel dosyasından siparişleri yükle
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { file } = body

    if (!file) {
      return NextResponse.json({ 
        error: 'Dosya gerekli',
        details: 'Lütfen Excel dosyasını base64 formatında gönderin.'
      }, { status: 400 })
    }

    // Base64'ü buffer'a çevir
    const buffer = Buffer.from(file, 'base64')
    
    // Excel dosyasını oku
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // JSON'a çevir - raw: true yaparak Excel tarih serial number'larını al
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: true })

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: 'Dosya boş',
        details: 'Excel dosyasında veri bulunamadı.'
      }, { status: 400 })
    }

    const db = getDatabase()
    const insertedOrders: any[] = []
    const errors: string[] = []

    // Her satırı işle
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any
      
      try {
        // Excel kolonlarını map et (büyük/küçük harf duyarsız)
        const getValue = (keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return String(row[key]).trim()
            }
          }
          return null
        }

        const trackingNumber = getValue(['TAKİP NO', 'TAKIP NO', 'Takip No', 'Tracking Number', 'TRACKING_NUMBER', 'tracking_number'])
        const dealerName = getValue(['CARİ ADI', 'CARI ADI', 'Bayi', 'Dealer', 'DEALER_NAME', 'dealer_name'])
        const customerName = getValue(['MÜŞTERİ ADI', 'MUSTERI ADI', 'Müşteri', 'Customer', 'CUSTOMER_NAME', 'customer_name'])
        const customerCode = getValue(['Müşteri Kodu', 'MUSTERI KODU', 'Customer Code', 'CUSTOMER_CODE', 'customer_code'])
        const productName = getValue(['ÜRÜN ADI', 'URUN ADI', 'Ürün', 'Product', 'PRODUCT_NAME', 'product_name'])
        const productSku = getValue(['SKU', 'sku'])
        const quantity = getValue(['SİP MİKTAR', 'SIP MIKTAR', 'Miktar', 'Quantity', 'QUANTITY', 'quantity'])
        const unitPrice = getValue(['Birim Fiyat', 'BIRIM FIYAT', 'Unit Price', 'UNIT_PRICE', 'unit_price'])
        const orderDate = getValue(['SİP TRH', 'SIP TRH'])
        const configuration = getValue(['KONFİGÜRASYON', 'KONFIGURASYON', 'Konfigürasyon', 'Configuration', 'CONFIGURATION', 'configuration'])
        const fabricCode = getValue(['KUMAŞ KODU', 'KUMAS KODU', 'Kumaş', 'Fabric', 'FABRIC_CODE', 'fabric_code'])
        const caseInfo = getValue(['KASA', 'Kasa', 'Case', 'CASE', 'case'])
        const legInfo = getValue(['AYAK', 'Ayak', 'Leg', 'LEG', 'leg'])
        const unit = getValue(['BRİM', 'BRIM', 'Birim', 'Unit', 'UNIT', 'unit'])
        const notes = getValue(['AÇIKLAMA', 'ACIKLAMA', 'Notlar', 'Notes', 'NOTES', 'notes'])

        // Zorunlu alanları kontrol et
        if (!productName) {
          errors.push(`Satır ${i + 2}: Ürün adı boş olamaz`)
          continue
        }

        const quantityNum = quantity ? parseFloat(String(quantity).replace(',', '.')) : 0
        const unitPriceNum = unitPrice ? parseFloat(String(unitPrice).replace(',', '.')) : 0
        const totalAmount = quantityNum * unitPriceNum

        // Ürünü bul (SKU veya isim ile)
        let productId: string | null = null
        if (productSku) {
          const product = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(productSku) as any
          if (product) {
            productId = product.id
          }
        }
        if (!productId && productName) {
          const product = db.prepare('SELECT id FROM active_products WHERE name LIKE ?').get(`%${productName}%`) as any
          if (product) {
            productId = product.id
          }
        }

        // Notları birleştir
        let combinedNotes = notes || ''
        if (fabricCode) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Kumaş: ${fabricCode}`
        }
        if (caseInfo) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Kasa: ${caseInfo}`
        }
        if (legInfo) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Ayak: ${legInfo}`
        }
        if (unit) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Birim: ${unit}`
        }

        // Tarih formatını düzelt
        let formattedOrderDate: string | null = null
        if (orderDate) {
          try {
            // Excel tarih formatlarını parse et
            const dateValue = orderDate
            
            // Eğer Excel serial date number ise (sayı olarak geliyorsa)
            if (typeof dateValue === 'number' && dateValue > 25569) {
              // Excel epoch: 1900-01-01 (Windows)
              const excelEpoch = new Date(1900, 0, 1)
              const days = dateValue - 2 // Excel'in bug'ı nedeniyle -2
              const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
              formattedOrderDate = date.toISOString().split('T')[0]
            } else {
              // String formatında geliyorsa
              const dateStr = String(dateValue).trim()
              
              // Eğer sayı string olarak geliyorsa
              if (!isNaN(Number(dateStr)) && Number(dateStr) > 25569) {
                const excelEpoch = new Date(1900, 0, 1)
                const days = Number(dateStr) - 2
                const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
                formattedOrderDate = date.toISOString().split('T')[0]
              } else if (dateStr.includes('-')) {
                // YYYY-MM-DD veya DD-MM-YYYY formatı kontrolü
                const parts = dateStr.split('-')
                if (parts.length === 3) {
                  // Eğer ilk parça 4 haneli ise YYYY-MM-DD
                  if (parts[0].length === 4) {
                    formattedOrderDate = dateStr
                  } else {
                    // DD-MM-YYYY formatı, YYYY-MM-DD'ye çevir
                    formattedOrderDate = `${parts[2]}-${parts[1]}-${parts[0]}`
                  }
                } else {
                  formattedOrderDate = dateStr
                }
              } else if (dateStr.includes('.') || dateStr.includes('/')) {
                // DD.MM.YYYY veya DD/MM/YYYY formatı
                const parts = dateStr.split(/[./]/)
                if (parts.length === 3) {
                  let day = parts[0].padStart(2, '0')
                  let month = parts[1].padStart(2, '0')
                  let year = parts[2]
                  
                  // Yıl 2 haneli ise 20xx'e çevir
                  if (year.length === 2) {
                    const yearNum = parseInt(year)
                    year = yearNum < 50 ? `20${year}` : `19${year}`
                  }
                  
                  formattedOrderDate = `${year}-${month}-${day}`
                } else {
                  formattedOrderDate = dateStr
                }
              } else {
                formattedOrderDate = dateStr
              }
            }
          } catch (e) {
            formattedOrderDate = String(orderDate)
          }
        }

        // Bayi isminden otomatik cari hesap oluştur (eğer yoksa)
        createAccountIfNotExists(db, dealerName)

        const orderId = randomUUID()
        // TAKİP NO varsa onu kullan, yoksa otomatik oluştur
        const orderNumber = trackingNumber || `SIP-${Date.now()}-${randomUUID().substring(0, 8)}`

        // Siparişi ekle (UNIQUE constraint olmadan - kısıt yok)
        db.prepare(`
          INSERT INTO orders (
            id, order_number, dealer_name, customer_name, customer_code, product_name, product_sku,
            product_id, quantity, unit_price, total_amount, order_date, delivery_date, status,
            configuration, notes, excel_row_number, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          orderId,
          orderNumber,
          dealerName,
          customerName,
          customerCode,
          productName,
          productSku,
          productId,
          quantityNum,
          unitPriceNum,
          totalAmount,
          formattedOrderDate,
          'pending',
          configuration,
          combinedNotes || null,
          i + 2 // Excel satır numarası (1-based + header)
        )

        insertedOrders.push({
          id: orderId,
          order_number: orderNumber,
          product_name: productName,
          quantity: quantityNum,
          status: 'pending'
        })
      } catch (error: any) {
        errors.push(`Satır ${i + 2}: ${error.message || 'Bilinmeyen hata'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${insertedOrders.length} sipariş başarıyla yüklendi${errors.length > 0 ? `, ${errors.length} satır atlandı` : ''}`,
      inserted_count: insertedOrders.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Excel yükleme hatası:', error)
    return NextResponse.json({ 
      error: 'Excel dosyası yüklenemedi',
      details: error.message 
    }, { status: 500 })
  }
})
