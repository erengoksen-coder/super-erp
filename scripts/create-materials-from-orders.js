const Database = require('better-sqlite3')
const { join } = require('path')
const { existsSync } = require('fs')
const { randomUUID } = require('crypto')

const dbPath = join(process.cwd(), 'data', 'erp.db')

if (!existsSync(dbPath)) {
  console.log('Veritabanı dosyası bulunamadı:', dbPath)
  process.exit(1)
}

const db = new Database(dbPath)
db.pragma('foreign_keys = OFF')

console.log('Siparişlerden kumaş kodları çıkarılıyor...\n')

// Tüm siparişleri al
const orders = db.prepare(`
  SELECT id, order_number, notes 
  FROM active_orders 
  WHERE notes IS NOT NULL AND notes != ''
`).all()

console.log(`Toplam ${orders.length} sipariş bulundu\n`)

// Kumaş kodlarını topla
const fabricMap = new Map() // key: fabricCode, value: { code, name, count }

orders.forEach(order => {
  if (!order.notes) return
  
  // Notes'tan kumaş kodunu çıkar: "Kumaş: ALASKA 10" veya "Kumaş:ALASKA 10" formatı
  const fabricMatch = order.notes.match(/Kumaş:\s*([^|]+)/i)
  if (fabricMatch) {
    const fabricText = fabricMatch[1].trim()
    
    // Kumaş kodunu tam olarak al (örn: "ALASKA 10")
    if (fabricText) {
      const key = fabricText.toLowerCase().trim()
      
      if (fabricMap.has(key)) {
        // Aynı kumaş kodu var, sayacı artır
        const existing = fabricMap.get(key)
        existing.count++
      } else {
        // Yeni kumaş kodu - tam kodu kaydet
        fabricMap.set(key, {
          fabricCode: fabricText, // Tam kumaş kodu (örn: "ALASKA 10")
          count: 1
        })
      }
    }
  }
})

console.log('Bulunan kumaş kodları:')
fabricMap.forEach((fabric, key) => {
  console.log(`  - Kumaş: ${fabric.fabricCode}, Sipariş Sayısı: ${fabric.count}`)
})
console.log(`\nToplam ${fabricMap.size} farklı kumaş kodu bulundu\n`)

// Mevcut malzemeleri kontrol et
const existingMaterials = db.prepare(`
  SELECT id, code, name 
  FROM materials 
  WHERE code IS NOT NULL AND code != ''
`).all()

const existingCodes = new Set(existingMaterials.map(m => m.code.toLowerCase().trim()))

console.log('Mevcut malzemeler kontrol ediliyor...')
console.log(`Mevcut malzeme sayısı: ${existingMaterials.length}\n`)

// Depo stok kodu için sayaç (KUMAŞ-001, KUMAŞ-002 formatında)
let fabricCounter = 1

// Yeni malzemeleri ekle
const insertMaterial = db.prepare(`
  INSERT INTO materials (id, code, name, category, unit, stock_amount, min_stock_level, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`)

let created = 0
let skipped = 0

fabricMap.forEach((fabric, key) => {
  const fabricCode = fabric.fabricCode // Tam kumaş kodu (örn: "ALASKA 10")
  
  // Depo stok kodu oluştur (KUMAŞ-001, KUMAŞ-002, ...)
  let materialCode = `KUMAŞ-${String(fabricCounter).padStart(3, '0')}`
  
  // Eğer bu kod zaten varsa, farklı bir kod dene
  while (existingCodes.has(materialCode)) {
    fabricCounter++
    materialCode = `KUMAŞ-${String(fabricCounter).padStart(3, '0')}`
  }
  
  // Tam kumaş kodunu da kontrol et (eğer kod olarak kullanılmışsa)
  if (existingCodes.has(fabricCode.toLowerCase().trim())) {
    console.log(`○ Atlanıyor (zaten var): ${fabricCode}`)
    skipped++
    return
  }
  
  try {
    const id = randomUUID()
    insertMaterial.run(
      id,
      materialCode, // Depo stok kodu (KUMAŞ-001, KUMAŞ-002, ...)
      fabricCode, // Hammadde adı (ALASKA 10, DARK 438, ...)
      'Kumaş', // Kategori
      'm²', // Birim
      0, // Stok miktarı
      0 // Min stok seviyesi
    )
    console.log(`✓ Oluşturuldu: Kod: ${materialCode}, Ad: ${fabricCode}`)
    created++
    fabricCounter++
    existingCodes.add(materialCode) // Yeni kodları takip et
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      console.log(`○ Atlanıyor (unique constraint): ${materialCode} - ${fabricCode}`)
      skipped++
      fabricCounter++ // Bir sonraki kodu kullan
    } else {
      console.log(`✗ Hata (${materialCode} - ${fabricCode}): ${error.message}`)
    }
  }
})

console.log(`\n✅ İşlem tamamlandı!`)
console.log(`   Oluşturulan: ${created} malzeme`)
console.log(`   Atlanan: ${skipped} malzeme (zaten mevcut)`)

db.close()
process.exit(0)

