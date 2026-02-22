import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

/**
 * POST: Siparişlerden kumaş kodlarını çıkarıp hammadde deposuna malzeme kartları oluştur
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    db.pragma('foreign_keys = OFF')

    // Tüm siparişleri al
    const orders = db.prepare(`
      SELECT id, order_number, notes 
      FROM active_orders 
      WHERE notes IS NOT NULL AND notes != ''
    `).all() as Array<{ id: string; order_number: string; notes: string }>

    // Kumaş kodlarını topla
    const fabricMap = new Map<string, { fabricCode: string; count: number }>()

    orders.forEach(order => {
      if (!order.notes) return
      
      // Notes'tan kumaş kodunu çıkar: "Kumaş: ALASKA 10" formatı
      const fabricMatch = order.notes.match(/Kumaş:\s*([^|]+)/i)
      if (fabricMatch) {
        const fabricText = fabricMatch[1].trim()
        
        if (fabricText) {
          const key = fabricText.toLowerCase().trim()
          
          if (fabricMap.has(key)) {
            // Aynı kumaş kodu var, sayacı artır
            const existing = fabricMap.get(key)!
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

    // Mevcut (silinmemiş) malzemeleri kontrol et — silinenler listede görünmediği için yeniden eklenebilir
    const existingMaterials = db.prepare(`
      SELECT id, code, name 
      FROM materials 
      WHERE (deleted_at IS NULL OR deleted_at = '')
        AND code IS NOT NULL AND code != '' AND category = ?
    `).all('Kumaş') as Array<{ id: string; code: string; name: string }>

    const existingCodes = new Set(existingMaterials.map(m => m.code.toLowerCase().trim()))
    const existingNames = new Set(existingMaterials.map(m => m.name.toLowerCase().trim()))

    // Kod numarası: tablodaki TÜM malzemelerdeki (silinmiş dahil) en yüksek KMS-XXX değerinin üstünde başla (UNIQUE çakışmasın)
    let fabricCounter = 1
    const allKmsCodes = db.prepare(`
      SELECT code FROM materials WHERE code IS NOT NULL AND code LIKE 'KMS-%'
    `).all() as Array<{ code: string }>
    allKmsCodes.forEach((m) => {
      const match = m.code.match(/KMS-(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (!Number.isNaN(num) && num >= fabricCounter) fabricCounter = num + 1
      }
    })

    // Yeni malzemeleri ekle
    const insertMaterial = db.prepare(`
      INSERT INTO materials (id, code, name, category, unit, stock_amount, min_stock_level, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)

    let created = 0
    let skipped = 0
    const createdMaterials: Array<{ code: string; name: string }> = []
    const skippedMaterials: Array<{ code: string; name: string; reason: string }> = []

    fabricMap.forEach((fabric, key) => {
      const fabricCode = fabric.fabricCode // Tam kumaş kodu (örn: "ALASKA 10")
      
      // Eğer bu kumaş adı zaten varsa, atla
      if (existingNames.has(fabricCode.toLowerCase().trim())) {
        skipped++
        skippedMaterials.push({ code: '', name: fabricCode, reason: 'Bu kumaş adı zaten mevcut' })
        return
      }
      
      // Depo stok kodu oluştur (KMS-001, KMS-002, ...)
      let materialCode = `KMS-${String(fabricCounter).padStart(3, '0')}`
      
      // Eğer bu kod zaten varsa, farklı bir kod dene
      while (existingCodes.has(materialCode)) {
        fabricCounter++
        materialCode = `KMS-${String(fabricCounter).padStart(3, '0')}`
      }
      
      try {
        const id = randomUUID()
        insertMaterial.run(
          id,
          materialCode, // Depo stok kodu (KMS-001, KMS-002, ...)
          fabricCode, // Hammadde adı (ALASKA 10, DARK 438, ...)
          'Kumaş', // Kategori
          'm²', // Birim
          0, // Stok miktarı
          0 // Min stok seviyesi
        )
        created++
        createdMaterials.push({ code: materialCode, name: fabricCode })
        fabricCounter++
        existingCodes.add(materialCode) // Yeni kodları takip et
        existingNames.add(fabricCode.toLowerCase().trim()) // Yeni adları takip et
      } catch (error: any) {
        skipped++
        if (error.message.includes('UNIQUE constraint')) {
          skippedMaterials.push({ code: materialCode, name: fabricCode, reason: 'Unique constraint hatası' })
        } else {
          skippedMaterials.push({ code: materialCode, name: fabricCode, reason: error.message })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `İşlem tamamlandı! ${created} malzeme oluşturuldu, ${skipped} malzeme atlandı.`,
      created,
      skipped,
      createdMaterials,
      skippedMaterials,
      totalFound: fabricMap.size
    }, { status: 200 })

  } catch (error: any) {
    console.error('Kumaş malzemeleri oluşturulurken hata:', error)
    return NextResponse.json(
      { error: 'Kumaş malzemeleri oluşturulamadı', details: error.message },
      { status: 500 }
    )
  }
})

