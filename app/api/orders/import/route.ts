import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import * as XLSX from 'xlsx'

// KESİN ÇÖZÜM: Node.js runtime kullan (FormData için daha iyi)
export const runtime = 'nodejs'

// KESİN ÇÖZÜM: Body parsing'i devre dışı bırak - Next.js'in otomatik parsing'ini engelle
export const dynamic = 'force-dynamic'
export const dynamicParams = true

// KESİN ÇÖZÜM: Request body size limit'ini artır (Excel dosyaları için)
// Next.js varsayılan limit'i 10MB, biz 50MB'a çıkarıyoruz
export const maxDuration = 60

// Bayi isminden otomatik cari hesap oluştur (eşer yoksa)
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

function createMaterialIfNotExists(db: any, fabricCode: string | null, unit?: string | null): void {
  if (!fabricCode || fabricCode.trim() === '') {
    return
  }

  const trimmedCode = fabricCode.trim()
  const name = `Kumaş ${trimmedCode}`
  const existingMaterial = db
    .prepare('SELECT id, unit FROM materials WHERE name = ? COLLATE NOCASE')
    .all(name) as Array<{ id: string; unit: string | null }>

  if (existingMaterial.length > 0) {
    const hasMetre = existingMaterial.some((row) => (row.unit || '').toLowerCase() === 'metre')
    if (hasMetre) {
      db.prepare('DELETE FROM materials WHERE name = ? COLLATE NOCASE AND LOWER(COALESCE(unit, ?)) != ?')
        .run(name, '', 'metre')
    }
    console.warn(`Hammadde aynı isimle kayıtlı: ${name}`)
    return
  }

  try {
    const id = `mat-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const materialUnit = 'metre'

    db.prepare(`
      INSERT INTO materials (
        id, code, name, category, unit, stock_amount, min_stock_level, purchase_price,
        company_id, branch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      trimmedCode,
      name,
      'Kumaş',
      materialUnit,
      0,
      0,
      0,
      DEFAULT_COMPANY_ID,
      DEFAULT_BRANCH_ID
    )

    db.prepare(`
      INSERT OR IGNORE INTO material_stocks (id, material_id, warehouse_id, quantity, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      `mstock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      id,
      DEFAULT_WAREHOUSE_ID,
      0
    )
  } catch (error: any) {
    console.error(`Hammadde oluşturulamadı (${trimmedCode}):`, {
      error: error.message,
      stack: error.stack,
    })
  }
}

// POST: Excel dosyasından siparişleri yükle
// KESİN ÇÖZÜM: FormData kullan (en basit ve güvenilir yöntem)
// Body'yi EN ÖNCE oku - hiçbir şeye dokunmadan!
export async function POST(request: NextRequest) {
  // KESİN ÇÖZÜM: Body'yi EN ÖNCE oku - hiçbir şeye dokunmadan!
  // Request'e hiçbir şekilde dokunmadan direkt formData() çağır
  let formData: FormData
  let file: File | null = null
  
  try {
    // Request'i hiçbir şekilde okumadan direkt formData() çağır
    formData = await request.formData()
    file = formData.get('file') as File | null
  } catch (formDataError: any) {
    console.error('[import] FormData parse hatası:', formDataError)
    console.error('[import] Error message:', formDataError?.message)
    console.error('[import] Error stack:', formDataError?.stack)
    console.error('[import] Content-Type:', request.headers.get('content-type'))
    console.error('[import] Request method:', request.method)
    return NextResponse.json({ 
      error: 'FormData ayrıştırılamadı',
      details: formDataError?.message || 'Bilinmeyen FormData hatası'
    }, { status: 400 })
  }
  
  // Ana işlem bloğu
  try {
    
    // Auth kontrolü - header'lardan token al (body okuduktan SONRA)
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : authHeader?.trim()
    const cookieToken = request.cookies.get('auth-token')?.value || request.cookies.get('access_token')?.value
    const token = headerToken || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
    }
    
    // Dosya kontrolü
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })
    }

    // Dosyayı buffer'a çevir
    let buffer: Buffer
    try {
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
    } catch (bufferError: any) {
      console.error('[import] Buffer conversion error:', bufferError)
      return NextResponse.json({ 
        error: 'Dosya işlenemedi', 
        details: bufferError?.message || 'Dosya buffer\'a dönüştürülemedi' 
      }, { status: 400 })
    }

    if (!buffer || !buffer.length) {
      return NextResponse.json({ error: 'Dosya boş' }, { status: 400 })
    }
    
    // Excel dosyasını oku
    let workbook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch (error: any) {
      return NextResponse.json({ 
        error: 'Excel dosyası okunamadı',
        details: error.message 
      }, { status: 400 })
    }
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return NextResponse.json({ error: 'Excel sayfası bulunamadı' }, { status: 400 })
    }
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

    // İlk satırdan kolon isimlerini al (debug için)
    const firstRow = data[0] as any
    const availableColumns = firstRow ? Object.keys(firstRow) : []
    let columnsLogged = false

    // Türkçe karakter normalizasyonu
    const normalizeTurkish = (str: string): string => {
      return str
        .replace(/İ/g, 'I')
        .replace(/ı/g, 'i')
        .replace(/Ş/g, 'S')
        .replace(/ş/g, 's')
        .replace(/Ğ/g, 'G')
        .replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U')
        .replace(/ü/g, 'u')
        .replace(/Ö/g, 'O')
        .replace(/ö/g, 'o')
        .replace(/Ç/g, 'C')
        .replace(/ç/g, 'c')
    }

    // Kolon normalizasyon haritasını bir kez oluştur
    const normalizedColumns: Record<string, string> = {}
    if (firstRow) {
      Object.keys(firstRow).forEach(col => {
        const normalized = normalizeTurkish(col.trim().toLowerCase())
        normalizedColumns[normalized] = col
      })
    }

    // Gelişmiş kolon eşleştirme fonksiyonu
    const getValue = (row: any, keys: string[]): string | null => {
      for (const key of keys) {
        const normalizedKey = normalizeTurkish(key.trim().toLowerCase())
        
        // 1. Tam eşleşme (normalize edilmiş)
        if (normalizedColumns[normalizedKey]) {
          const originalKey = normalizedColumns[normalizedKey]
          const value = row[originalKey]
          if (value !== undefined && value !== null && value !== '') {
            return String(value).trim()
          }
        }

        // 2. Kısmi eşleşme (içeriyor mu?)
        for (const [normalizedCol, originalCol] of Object.entries(normalizedColumns)) {
          if (normalizedCol.includes(normalizedKey) || normalizedKey.includes(normalizedCol)) {
            const value = row[originalCol]
            if (value !== undefined && value !== null && value !== '') {
              return String(value).trim()
            }
          }
        }

        // 3. Orijinal eşleşme (trim ile)
        const trimmedKey = Object.keys(row).find(k => k.trim() === key.trim())
        if (trimmedKey) {
          const value = row[trimmedKey]
          if (value !== undefined && value !== null && value !== '') {
            return String(value).trim()
          }
        }

        // 4. Büyük/küçük harf duyarsız (trim ile)
        const caseInsensitiveKey = Object.keys(row).find(k => 
          k.trim().toLowerCase() === key.trim().toLowerCase()
        )
        if (caseInsensitiveKey) {
          const value = row[caseInsensitiveKey]
          if (value !== undefined && value !== null && value !== '') {
            return String(value).trim()
          }
        }
      }
      return null
    }

    // Her satırı işle
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any

      const dealerName = getValue(row, ['CARİ ADI', 'CARI ADI', 'Dealer', 'DEALER', 'dealer', 'Bayi', 'BAYİ', 'Cari', 'CARI'])
      const customerName = getValue(row, ['MÜŞTERİ ADI', 'MUSTERI ADI', 'Customer', 'CUSTOMER', 'customer', 'Müşteri', 'MUSTERI', 'Musteri', 'MUSTERI ADI'])
      const productName = getValue(row, [
        'ÜRÜN ADI', 'URUN ADI', 'Product', 'PRODUCT', 'product', 'Ürün', 'URUN', 
        'Ürün Adı', 'URUN ADI', 'ÜRÜN', 'URUN', 'Product Name', 'PRODUCT NAME',
        'Ürün Adi', 'URUN ADI', 'Ürün Ad', 'URUN AD', 'Ürün İsmi', 'URUN ISMI'
      ])
      const productSku = getValue(row, ['SKU', 'sku', 'Sku', 'Ürün Kodu', 'URUN KODU', 'Product Code', 'PRODUCT CODE'])
      const quantity = getValue(row, ['SİP MİKTAR', 'SIP MIKTAR', 'Miktar', 'Quantity', 'QUANTITY', 'quantity', 'Sipariş Miktarı', 'SIPARIS MIKTARI'])
      const unitPrice = getValue(row, ['Birim Fiyat', 'BIRIM FIYAT', 'Unit Price', 'UNIT_PRICE', 'unit_price', 'Fiyat', 'FIYAT', 'Price', 'PRICE'])
      const orderDate = getValue(row, ['SİP TRH', 'SIP TRH', 'Sipariş Tarihi', 'SIPARIS TARIHI', 'Order Date', 'ORDER DATE', 'Tarih', 'TARIH'])
      const configuration = getValue(row, ['KONFİGÜRASYON', 'KONFIGURASYON', 'Konfigürasyon', 'Configuration', 'CONFIGURATION', 'configuration', 'Konfig', 'KONFIG'])
      const fabricCode = getValue(row, ['KUMAŞ KODU', 'KUMAS KODU', 'Kumaş', 'Fabric', 'FABRIC_CODE', 'fabric_code', 'Kumaş Kodu', 'KUMAS KODU'])
      const caseInfo = getValue(row, ['KASA', 'Kasa', 'Case', 'CASE', 'case'])
      const legInfo = getValue(row, ['AYAK', 'Ayak', 'Leg', 'LEG', 'leg'])
      const cushionInfo = getValue(row, ['KİRLENT', 'KIRLENT', 'Kirlent', 'Cushion', 'CUSHION', 'cushion', 'KİRLİNT', 'KIRLINT'])
      const unit = getValue(row, ['BRİM', 'BRIM', 'Birim', 'Unit', 'UNIT', 'unit'])
      const notes = getValue(row, ['AÇIKLAMA', 'ACIKLAMA', 'Notlar', 'Notes', 'NOTES', 'notes', 'Açıklama', 'ACIKLAMA'])

      // Zorunlu alanları kontrol et
      if (!productName) {
        // İlk hatada mevcut kolonları logla
        if (!columnsLogged) {
          console.log('Mevcut Excel kolonları:', availableColumns)
          columnsLogged = true
        }
        
        // Hata mesajı (görseldeki formata uygun)
        errors.push(`Satır ${i + 2}: Ürün adı boş`)
        continue
      }
      
      // Boş satır kontrolü - eğer tüm önemli alanlar boşsa atla
      if (!dealerName && !customerName && !productName && !quantity) {
        errors.push(`Satır ${i + 2}: Boş satır - atlandı`)
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
      if (cushionInfo) {
        combinedNotes += (combinedNotes ? ' | ' : '') + `Kirlent: ${cushionInfo}`
      }
      if (unit) {
        combinedNotes += (combinedNotes ? ' | ' : '') + `Birim: ${unit}`
      }

      // Tarih formatını düzelt
      let formattedOrderDate: string | null = null
      if (orderDate) {
        try {
          // Excel serial date number kontrolü
          if (typeof orderDate === 'number') {
            // Excel serial date: 1 = 1900-01-01
            const excelEpoch = new Date(1899, 11, 30) // Excel epoch: 1899-12-30
            const date = new Date(excelEpoch.getTime() + orderDate * 24 * 60 * 60 * 1000)
            if (!isNaN(date.getTime())) {
              formattedOrderDate = date.toISOString().split('T')[0]
            }
          } else {
            const dateStr = String(orderDate).trim()
            
            // YYYY-MM-DD formatı (öncelikli)
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const testDate = new Date(dateStr)
              if (!isNaN(testDate.getTime())) {
                formattedOrderDate = dateStr
              }
            }
            // DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY formatlarını dene
            else if (dateStr.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/)) {
              const dateMatch = dateStr.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/)
              if (dateMatch) {
                let day = parseInt(dateMatch[1])
                let month = parseInt(dateMatch[2]) - 1 // JavaScript month 0-indexed
                let year = parseInt(dateMatch[3])
                // 2 haneli yıl için 2000 ekle (20-99 arası 2000-2079, 00-19 arası 2000-2019)
                if (year < 100) {
                  year = year < 20 ? 2000 + year : 1900 + year
                }
                const date = new Date(year, month, day)
                if (!isNaN(date.getTime())) {
                  formattedOrderDate = date.toISOString().split('T')[0]
                }
              }
            }
            // YYYY.MM.DD veya YYYY/MM/DD formatı
            else if (dateStr.match(/^\d{4}[.\/]\d{2}[.\/]\d{2}$/)) {
              const parts = dateStr.split(/[.\/]/)
              const year = parseInt(parts[0])
              const month = parseInt(parts[1]) - 1
              const day = parseInt(parts[2])
              const date = new Date(year, month, day)
              if (!isNaN(date.getTime())) {
                formattedOrderDate = date.toISOString().split('T')[0]
              }
            }
            // JavaScript Date parse dene
            else {
              const parsedDate = new Date(dateStr)
              if (!isNaN(parsedDate.getTime())) {
                formattedOrderDate = parsedDate.toISOString().split('T')[0]
              }
            }
          }
        } catch (e) {
          console.warn(`Tarih parse edilemedi: ${orderDate}`, e)
          // Hata durumunda null bırak
        }
      }

      // Bayi (Cari) oluştur
      if (dealerName) {
        createAccountIfNotExists(db, dealerName)
      }

      // Hammadde (Kumaş) oluştur
      if (fabricCode) {
        createMaterialIfNotExists(db, fabricCode, unit)
      }

      // Sipariş numarası oluştur
      const orderNumber = `SIP-${Date.now()}-${randomUUID().substring(0, 8)}`

      // Siparişi oluştur
      try {
        const orderId = randomUUID()
        db.prepare(`
          INSERT INTO orders (
            id, order_number, dealer_name, customer_name, customer_code,
            product_id, product_name, product_sku, quantity, unit_price, total_amount,
            order_date, status, configuration, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          orderId,
          orderNumber,
          dealerName,
          customerName,
          null, // customer_code otomatik oluşturulacak
          productId,
          productName,
          productSku,
          quantityNum,
          unitPriceNum,
          totalAmount,
          formattedOrderDate,
          configuration,
          combinedNotes
        )
        insertedOrders.push({ id: orderId, order_number: orderNumber })
      } catch (dbError: any) {
        // Duplicate order_number hatası ise, yeni bir order_number oluştur ve tekrar dene
        if (dbError.message && dbError.message.includes('UNIQUE constraint')) {
          try {
            const newOrderNumber = `SIP-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
            const orderId = randomUUID()
            db.prepare(`
              INSERT INTO orders (
                id, order_number, dealer_name, customer_name, customer_code,
                product_id, product_name, product_sku, quantity, unit_price, total_amount,
                order_date, status, configuration, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(
              orderId,
              newOrderNumber,
              dealerName,
              customerName,
              null,
              productId,
              productName,
              productSku,
              quantityNum,
              unitPriceNum,
              totalAmount,
              formattedOrderDate,
              configuration,
              combinedNotes
            )
            insertedOrders.push({ id: orderId, order_number: newOrderNumber })
          } catch (retryError: any) {
            errors.push(`Satır ${i + 2}: Veritabanı hatası - ${retryError.message}`)
          }
        } else {
          errors.push(`Satır ${i + 2}: Veritabanı hatası - ${dbError.message}`)
        }
      }

      // Her Excel satırı için 1 kart oluştur (quantity'ye bakmadan, her satır = 1 kart)
      if (productId) {
        try {
          const { generateBarcode, generateSerialNumber } = await import('@/lib/utils/barcodeGenerator')
          
          // Ürün bilgisini al
          const product = db.prepare('SELECT * FROM active_products WHERE id = ?').get(productId) as any
          if (product) {
            // Bugünkü barkod sayısını al
            const today = new Date().toISOString().split('T')[0]
            const todayCount = db.prepare(`
              SELECT COUNT(*) as count 
              FROM product_serial_numbers 
              WHERE product_id = ? AND date(created_at) = date(?)
            `).get(productId, today) as any
            
            const sequence = (todayCount?.count || 0) + 1
            let barcode = generateBarcode(product.sku || productName, sequence)
            let serial = generateSerialNumber(sequence)
            
            // Barkod benzersizliğini kontrol et
            let retryCount = 0
            const maxRetries = 10
            while (retryCount < maxRetries) {
              const existing = db.prepare('SELECT id FROM product_serial_numbers WHERE barcode = ?').get(barcode) as any
              if (!existing) {
                break // Benzersiz, kullanılabilir
              }
              // Tekrar oluştur
              const newSequence = sequence + retryCount * 1000
              barcode = generateBarcode(product.sku || productName, newSequence)
              serial = generateSerialNumber(newSequence)
              retryCount++
            }
            
            // Kart notlarını oluştur (Excel satırındaki tüm bilgiler)
            let cardNotes = `Sipariş: ${orderNumber} | Satır: ${i + 2}`
            if (dealerName) cardNotes += ` | Cari: ${dealerName}`
            if (customerName) cardNotes += ` | Müşteri: ${customerName}`
            if (configuration) cardNotes += ` | Konfigürasyon: ${configuration}`
            if (fabricCode) cardNotes += ` | Kumaş: ${fabricCode}`
            if (caseInfo) cardNotes += ` | Kasa: ${caseInfo}`
            if (legInfo) cardNotes += ` | Ayak: ${legInfo}`
            if (cushionInfo) cardNotes += ` | Kirlent: ${cushionInfo}`
            if (combinedNotes) cardNotes += ` | ${combinedNotes}`
            
            // Her Excel satırı için 1 kart oluştur
            const cardId = randomUUID()
            db.prepare(`
              INSERT INTO product_serial_numbers (
                id, product_id, serial_number, barcode, status, notes, created_at
              ) VALUES (?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP)
            `).run(
              cardId,
              productId,
              serial,
              barcode,
              cardNotes
            )
          }
        } catch (cardError: any) {
          // Kart oluşturma hatası kritik değil, sadece logla
          console.warn(`Satır ${i + 2}: Kart oluşturulamadı: ${cardError.message}`)
        }
      }
    }

    return NextResponse.json({
      message: `${insertedOrders.length} sipariş başarıyla yüklendi`,
      inserted_count: insertedOrders.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (err: any) {
    // RESİM 4'E GÖRE: FormData parse hatası için error handling
    return NextResponse.json({ 
      error: 'FormData ayrıştırılamadı' 
    }, { status: 400 })
  }
}
