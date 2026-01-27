import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: İstasyona göre üretim emirlerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const station = searchParams.get('station') || 'iskelet'

    const db = getDatabase()

    // İstasyon sırası kontrolü
    const stationOrder = ['iskelet', 'terzihane', 'döseme', 'montaj', 'sevkiyat', 'completed']
    if (!stationOrder.includes(station)) {
      return NextResponse.json(
        { error: 'Geçersiz istasyon' },
        { status: 400 }
      )
    }

    // İstasyon için üretim emirlerini getir
    const orders = db.prepare(`
      SELECT 
        po.id,
        po.order_number,
        po.quantity,
        po.status,
        po.current_station,
        po.created_at,
        po.iskelet_started_at,
        po.iskelet_completed_at,
        po.terzihane_started_at,
        po.terzihane_completed_at,
        po.döseme_started_at,
        po.döseme_completed_at,
        po.montaj_started_at,
        po.montaj_completed_at,
        p.name as product_name,
        p.sku as product_sku
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      WHERE po.current_station = ?
        AND po.status != 'completed'
        AND po.status != 'cancelled'
      ORDER BY po.created_at ASC
    `).all(station)

    return NextResponse.json({
      station,
      orders,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Üretim emrini bir sonraki istasyona geçir
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, station, notes } = body

    if (!order_id || !station) {
      return NextResponse.json(
        { error: 'order_id ve station gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Üretim emrini bul
    const order = db.prepare('SELECT * FROM production_orders WHERE id = ?').get(order_id) as any
    if (!order) {
      return NextResponse.json({ error: 'Üretim emri bulunamadı' }, { status: 404 })
    }

    const currentStation = order.current_station || 'iskelet'
    const stationOrder = ['iskelet', 'terzihane', 'döseme', 'montaj', 'sevkiyat', 'completed']
    const currentIndex = stationOrder.indexOf(currentStation)
    
    // Montaj bitince direkt completed durumuna geç (sevkiyat'ı atla)
    let nextIndex = currentIndex + 1
    if (currentStation === 'montaj') {
      nextIndex = stationOrder.indexOf('completed')
    }

    if (nextIndex >= stationOrder.length) {
      return NextResponse.json(
        { error: 'Üretim tamamlandı' },
        { status: 400 }
      )
    }

    const nextStation = stationOrder[nextIndex]
    const now = new Date().toISOString()

    db.transaction(() => {
      // İstasyon geçişi
      let updateQuery = `UPDATE production_orders SET current_station = ?, updated_at = ?`
      const updateParams: any[] = [nextStation, now]

      // Önceki istasyonu tamamla
      if (currentStation === 'iskelet') {
        updateQuery += `, iskelet_completed_at = ?`
        updateParams.push(now)
        if (!order.iskelet_started_at) {
          updateQuery += `, iskelet_started_at = ?`
          updateParams.push(now)
        }
      } else if (currentStation === 'terzihane') {
        updateQuery += `, terzihane_completed_at = ?`
        updateParams.push(now)
        if (!order.terzihane_started_at) {
          updateQuery += `, terzihane_started_at = ?`
          updateParams.push(now)
        }
      } else if (currentStation === 'döseme') {
        updateQuery += `, döseme_completed_at = ?`
        updateParams.push(now)
        if (!order.döseme_started_at) {
          updateQuery += `, döseme_started_at = ?`
          updateParams.push(now)
        }
      } else if (currentStation === 'montaj') {
        updateQuery += `, montaj_completed_at = ?`
        updateParams.push(now)
        if (!order.montaj_started_at) {
          updateQuery += `, montaj_started_at = ?`
          updateParams.push(now)
        }
      }

      // Sonraki istasyonu başlat
      if (nextStation === 'terzihane' && !order.terzihane_started_at) {
        updateQuery += `, terzihane_started_at = ?`
        updateParams.push(now)
      } else if (nextStation === 'döseme' && !order.döseme_started_at) {
        updateQuery += `, döseme_started_at = ?`
        updateParams.push(now)
      } else if (nextStation === 'montaj' && !order.montaj_started_at) {
        updateQuery += `, montaj_started_at = ?`
        updateParams.push(now)
      } else if (nextStation === 'sevkiyat' && !order.sevkiyat_started_at) {
        updateQuery += `, sevkiyat_started_at = ?`
        updateParams.push(now)
      } else if (nextStation === 'completed') {
        updateQuery += `, status = 'completed', completed_at = ?`
        updateParams.push(now)
      }

      updateQuery += ` WHERE id = ?`
      updateParams.push(order_id)

      db.prepare(updateQuery).run(...updateParams)

      // Döşeme aşamasına geçildiğinde otomatik stok düşümü
      if (nextStation === 'döseme' && order.stock_deducted === 0) {
        const bom = db.prepare(`
          SELECT 
            b.material_id,
            b.quantity_required,
            COALESCE(b.fire_percentage, 0) as fire_percentage,
            m.name as material_name,
            m.stock_amount,
            m.unit
          FROM bom b
          JOIN materials m ON b.material_id = m.id
          WHERE b.product_id = ?
        `).all(order.product_id)

        // Her malzeme için stok düş
        for (const item of bom) {
          const firePercentage = item.fire_percentage || 0
          const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
          const required = quantityWithFire * order.quantity

          // Stok kontrolü
          if (item.stock_amount < required) {
            // Stok yetersiz ama işlemi geri almayalım, sadece uyarı verelim
            console.warn(`Stok yetersiz: ${item.material_name}`)
          } else {
            // Stoku düş
            const newStock = item.stock_amount - required
            db.prepare('UPDATE materials SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(newStock, item.material_id)

            // Stok hareketi kaydı (quantity pozitif olmalı, movement_type 'out' olduğu için otomatik düşecek)
            const movementId = require('crypto').randomUUID()
            db.prepare(`
              INSERT INTO stock_movements 
              (id, material_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
              VALUES (?, ?, 'out', ?, 'production', ?, ?, CURRENT_TIMESTAMP)
            `).run(
              movementId,
              item.material_id,
              required, // Pozitif değer (movement_type 'out' olduğu için trigger otomatik düşecek)
              order_id,
              `Üretim: ${order.order_number} - Döşeme aşaması (Fire: ${firePercentage}%)`
            )
          }
        }

        // Stok düşümü yapıldı işaretle
        db.prepare('UPDATE production_orders SET stock_deducted = 1 WHERE id = ?').run(order_id)
      }

      // Montaj tamamlandığında mamül depoya ekle
      if (nextStation === 'completed' || (currentStation === 'montaj' && nextStation === 'completed')) {
        // Mevcut stoku al
        const currentStock = db.prepare('SELECT stock_amount FROM products WHERE id = ?').get(order.product_id) as any
        const newStock = (currentStock?.stock_amount || 0) + order.quantity
        
        // Ürün stokunu artır
        db.prepare(`
          UPDATE products
          SET stock_amount = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newStock, order.product_id)

        // Barkodlar oluştur (eğer yoksa) veya mevcut barkodları mamül depoya al
        const existingBarcodes = db.prepare(`
          SELECT id, status
          FROM product_serial_numbers
          WHERE production_order_id = ?
        `).all(order_id) as any[]

        if (existingBarcodes.length === 0) {
          // Her ürün için barkod oluştur
          const { generateBarcode, generateSerialNumber } = await import('@/lib/utils/barcodeGenerator')
          const today = new Date().toISOString().split('T')[0]
          
          // Bugünkü barkod sayısını al
          const todayCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM product_serial_numbers
            WHERE DATE(created_at) = DATE('now')
          `).get() as any
          const sequence = (todayCount?.count || 0) + 1

          for (let i = 0; i < order.quantity; i++) {
            const barcodeId = require('crypto').randomUUID()
            const barcode = generateBarcode(order.product_id, sequence + i)
            const serialNumber = generateSerialNumber(order.order_number, i + 1)

            db.prepare(`
              INSERT INTO product_serial_numbers 
              (id, product_id, production_order_id, serial_number, barcode, status, created_at)
              VALUES (?, ?, ?, ?, ?, 'available', CURRENT_TIMESTAMP)
            `).run(barcodeId, order.product_id, order_id, serialNumber, barcode)
          }
        } else {
          // Mevcut barkodların status'ünü 'available' yap (mamül depoya al)
          db.prepare(`
            UPDATE product_serial_numbers
            SET status = 'available'
            WHERE production_order_id = ? AND (status IS NULL OR status = 'in_stock' OR status = 'in_production')
          `).run(order_id)
        }

        // Stok hareketi kaydı (mamül depo girişi) - opsiyonel
        try {
          const movementId = require('crypto').randomUUID()
          db.prepare(`
            INSERT INTO stock_movements 
            (id, material_id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
            VALUES (?, NULL, ?, 'in', ?, 'production', ?, ?, CURRENT_TIMESTAMP)
          `).run(
            movementId,
            order.product_id,
            order.quantity,
            order_id,
            `Üretim Tamamlandı: ${order.order_number} - Montaj bitince mamül depoya eklendi`
          )
        } catch (movementError) {
          // stock_movements tablosunda product_id kolonu yoksa hata vermesin
          console.warn('Stok hareketi kaydedilemedi (opsiyonel):', movementError)
        }
      }
    })()

    return NextResponse.json({
      success: true,
      message: `Üretim emri ${nextStation} istasyonuna geçirildi`,
      order: {
        ...order,
        current_station: nextStation,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

