import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 dakika (büyük dosyalar için)

const CHUNK_DIR = path.join(process.cwd(), '.next', 'chunks')

// Dizini oluştur (yoksa)
if (!fs.existsSync(CHUNK_DIR)) {
  fs.mkdirSync(CHUNK_DIR, { recursive: true })
}

// Import edilen fonksiyonlar (route.ts'den)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uploadId, fileName, totalChunks, fileSize } = body
    
    // Auth kontrolü
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
    
    if (!uploadId || !fileName || !totalChunks) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }
    
    // Tüm chunk'ları birleştir
    const mergedPath = path.join(CHUNK_DIR, `${uploadId}_merged.xlsx`)
    
    // Chunk'ları kontrol et
    const missingChunks: number[] = []
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(CHUNK_DIR, `${uploadId}_${i}.chunk`)
      if (!fs.existsSync(chunkPath)) {
        missingChunks.push(i)
      }
    }
    
    if (missingChunks.length > 0) {
      console.error(`[merge] Eksik chunk'lar: ${missingChunks.join(', ')}`)
      return NextResponse.json({ 
        error: `Eksik chunk'lar bulundu: ${missingChunks.join(', ')}` 
      }, { status: 400 })
    }
    
    // Chunk'ları birleştir (promise ile)
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(mergedPath)
      
      writeStream.on('error', reject)
      writeStream.on('finish', resolve)
      
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(CHUNK_DIR, `${uploadId}_${i}.chunk`)
        const chunkData = fs.readFileSync(chunkPath)
        writeStream.write(chunkData)
      }
      
      writeStream.end()
    })
    
    // Chunk dosyalarını temizle
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(CHUNK_DIR, `${uploadId}_${i}.chunk`)
      if (fs.existsSync(chunkPath)) {
        fs.unlinkSync(chunkPath)
      }
    }
    
    // Birleştirilmiş dosyayı oku ve işle
    const buffer = fs.readFileSync(mergedPath)
    
    // Excel dosyasını oku
    let workbook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch (error: any) {
      fs.unlinkSync(mergedPath)
      return NextResponse.json({ 
        error: 'Excel dosyası okunamadı',
        details: error.message 
      }, { status: 400 })
    }
    
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      fs.unlinkSync(mergedPath)
      return NextResponse.json({ error: 'Excel sayfası bulunamadı' }, { status: 400 })
    }
    const worksheet = workbook.Sheets[firstSheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: true })
    
    if (!data || data.length === 0) {
      fs.unlinkSync(mergedPath)
      return NextResponse.json({ error: 'Excel dosyası boş' }, { status: 400 })
    }
    
    // Birleştirilmiş dosyayı temizle
    fs.unlinkSync(mergedPath)
    
    // Excel verilerini işle (route.ts'deki aynı mantık)
    const db = getDatabase()
    const errors: string[] = []
    const insertedOrders: any[] = []
    
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
    
    // Import edilen fonksiyonlar
    const { generateBarcode, generateSerialNumber } = await import('@/lib/utils/barcodeGenerator')
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any
      
      try {
        // route.ts'deki aynı kolon isimleri (gelişmiş eşleştirme ile)
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
        const orderNumber = getValue(row, ['TAKİP NO', 'TAKIP NO', 'Tracking Number', 'tracking number', 'Sipariş No', 'SIPARIS NO'])
        
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

        // Notları birleştir (route.ts'deki aynı mantık)
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
        
        // Account ve Material oluştur
        if (dealerName) createAccountIfNotExists(db, dealerName)
        if (fabricCode) createMaterialIfNotExists(db, fabricCode)
        
        // Order oluştur (route.ts'deki aynı mantık)
        const orderId = randomUUID()
        let formattedOrderDate: string | null = null
        if (orderDate) {
          try {
            // Excel serial date number kontrolü
            if (typeof orderDate === 'number') {
              const excelEpoch = new Date(1899, 11, 30)
              const date = new Date(excelEpoch.getTime() + orderDate * 24 * 60 * 60 * 1000)
              if (!isNaN(date.getTime())) {
                formattedOrderDate = date.toISOString().split('T')[0]
              }
            } else {
              const dateStr = String(orderDate).trim()
              if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const testDate = new Date(dateStr)
                if (!isNaN(testDate.getTime())) {
                  formattedOrderDate = dateStr
                }
              } else if (dateStr.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/)) {
                const dateMatch = dateStr.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/)
                if (dateMatch) {
                  let day = parseInt(dateMatch[1])
                  let month = parseInt(dateMatch[2]) - 1
                  let year = parseInt(dateMatch[3])
                  if (year < 100) {
                    year = year < 20 ? 2000 + year : 1900 + year
                  }
                  const date = new Date(year, month, day)
                  if (!isNaN(date.getTime())) {
                    formattedOrderDate = date.toISOString().split('T')[0]
                  }
                }
              } else if (dateStr.match(/^\d{4}[.\/]\d{2}[.\/]\d{2}$/)) {
                const parts = dateStr.split(/[.\/]/)
                const year = parseInt(parts[0])
                const month = parseInt(parts[1]) - 1
                const day = parseInt(parts[2])
                const date = new Date(year, month, day)
                if (!isNaN(date.getTime())) {
                  formattedOrderDate = date.toISOString().split('T')[0]
                }
              } else {
                const parsedDate = new Date(dateStr)
                if (!isNaN(parsedDate.getTime())) {
                  formattedOrderDate = parsedDate.toISOString().split('T')[0]
                }
              }
            }
          } catch (e) {
            console.warn(`Tarih parse edilemedi: ${orderDate}`, e)
          }
        }

        try {
          // Sipariş numarası oluştur
          const finalOrderNumber = orderNumber || `SIP-${Date.now()}-${randomUUID().substring(0, 8)}`
          
          db.prepare(`
            INSERT INTO orders (
              id, order_number, dealer_name, customer_name, customer_code,
              product_id, product_name, product_sku, quantity, unit_price, total_amount,
              order_date, status, configuration, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            orderId,
            finalOrderNumber,
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
          insertedOrders.push({ id: orderId, order_number: finalOrderNumber })
          
          // Her Excel satırı için 1 kart oluştur (quantity'ye bakmadan, her satır = 1 kart)
          if (productId) {
            try {
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
                let cardNotes = `Sipariş: ${finalOrderNumber} | Satır: ${i + 2}`
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
      } catch (rowError: any) {
        errors.push(`Satır ${i + 2}: ${rowError.message}`)
      }
    }
    
    return NextResponse.json({
      message: `${insertedOrders.length} sipariş başarıyla yüklendi`,
      inserted_count: insertedOrders.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('[merge] Hata:', error)
    return NextResponse.json({
      error: 'Dosya birleştirilemedi',
      details: error?.message || 'Bilinmeyen hata'
    }, { status: 500 })
  }
}
