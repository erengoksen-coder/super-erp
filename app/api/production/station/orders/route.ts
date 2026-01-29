import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { generateBarcode, generateSerialNumber } from '@/lib/utils/barcodeGenerator'

type ProductionOrderRow = {
  id: string
  order_number: string
  quantity: number
  status: string
  current_station: string | null
  created_at: string
  product_name: string
  product_sku: string
  [key: string]: unknown
}

type OrderInfoRow = {
  dealer_name: string | null
  customer_name: string | null
  id: string
  notes: string | null
  configuration: string | null
  product_name: string | null
}

type StationOrderCard = ProductionOrderRow & {
  dealer_name: string | null
  customer_name: string | null
  order_id: string | null
  order_production_order_id: string | null
  order_notes: string | null
  order_configuration: string | null
  order_product_name: string | null
  item_index: number
  item_total: number
  display_quantity: number
  completed_count: number
}

type ProductionOrderDetails = {
  id: string
  product_id: string
  order_number: string
  quantity: number
  current_station: string | null
  stock_deducted: number
  [key: string]: unknown
}

type ProductNameRow = {
  name: string
}

type ProductStockRow = {
  stock_amount: number | null
}

type BarcodeCountRow = {
  count: number | null
}

type SerialStatusRow = {
  id: string
  status: string | null
}

// GET: İstasyona göre üretim emirlerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const station = searchParams.get('station') || 'iskelet'

    const db = getDatabase()

    // İstasyon sırası kontrolü
    const stationOrder = ['iskelet', 'terzihane', 'döseme', 'montaj', 'berjer', 'sevkiyat', 'completed']
    if (!stationOrder.includes(station)) {
      return NextResponse.json(
        { error: 'Geçersiz istasyon' },
        { status: 400 }
      )
    }

    // İstasyon için üretim emirlerini getir
    // Önce temel sorguyu yap
    let productionOrders = db.prepare(`
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
        po.berjer_started_at,
        po.berjer_completed_at,
        po.döseme_started_at,
        po.döseme_completed_at,
        po.montaj_started_at,
        po.montaj_completed_at,
        po.sevkiyat_started_at,
        po.sevkiyat_completed_at,
        COALESCE(po.iskelet_completed_count, 0) as iskelet_completed_count,
        COALESCE(po.terzihane_completed_count, 0) as terzihane_completed_count,
        COALESCE(po.berjer_completed_count, 0) as berjer_completed_count,
        COALESCE(po.döseme_completed_count, 0) as döseme_completed_count,
        COALESCE(po.montaj_completed_count, 0) as montaj_completed_count,
        COALESCE(po.sevkiyat_completed_count, 0) as sevkiyat_completed_count,
        p.name as product_name,
        p.sku as product_sku
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      WHERE po.current_station = ?
        AND po.status != 'completed'
        AND po.status != 'cancelled'
      ORDER BY po.created_at ASC
    `).all(station) as ProductionOrderRow[]
    
    // Her üretim emri için orders tablosundan bayi/müşteri bilgisini al
    productionOrders = productionOrders.map((po) => {
      const orderInfo = db
        .prepare('SELECT dealer_name, customer_name, id, notes, configuration, product_name FROM orders WHERE production_order_id = ?')
        .get(po.id) as OrderInfoRow | undefined
      return {
        ...po,
        dealer_name: orderInfo?.dealer_name || null,
        customer_name: orderInfo?.customer_name || null,
        order_id: orderInfo?.id || null,
        order_production_order_id: orderInfo ? po.id : null,
        order_notes: orderInfo?.notes || null,
        order_configuration: orderInfo?.configuration || null,
        order_product_name: orderInfo?.product_name || null
      }
    })
    
    // Her üretim emri için quantity kadar ayrı kart oluştur
    // Ancak sadece tamamlanmayan kartları göster
    const orders: StationOrderCard[] = []
    for (const po of productionOrders) {
      const quantity = po.quantity || 1
      // Bu istasyon için tamamlanan kart sayısını al
      const completedCountColumn = `${station}_completed_count`
      const completedCount = (po as Record<string, number | undefined>)[completedCountColumn] || 0
      
      // Sadece tamamlanmayan kartları ekle
      // Örneğin 2 kart tamamlandıysa (completedCount=2), kalan 2 kartı göster (i=2,3 -> item_index=3,4)
      for (let i = completedCount; i < quantity; i++) {
        orders.push({
          ...po,
          item_index: i + 1, // 1'den başlayan index (tamamlanan kartlar dahil, örn: 2 tamamlandıysa 3,4,5...)
          item_total: quantity, // Toplam adet
          display_quantity: 1, // Her kart 1 adet gösterir
          completed_count: completedCount // Tamamlanan kart sayısı
        })
      }
    }
    
    // Debug: İlk siparişin bayi/müşteri bilgisini logla
    if (orders.length > 0) {
      const firstOrder = orders[0]
      console.log('İstasyon siparişleri:', {
        station,
        total_cards: orders.length,
        unique_production_orders: productionOrders.length,
        first_order: {
          production_order_id: firstOrder.id,
          order_id: firstOrder.order_id,
          item_index: firstOrder.item_index,
          item_total: firstOrder.item_total,
          dealer_name: firstOrder.dealer_name,
          customer_name: firstOrder.customer_name
        }
      })
    }

    return NextResponse.json({
      station,
      orders,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Üretim emrini bir sonraki istasyona geçir veya geri çevir
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, station, notes, item_index, item_total, revert } = body

    if (!order_id || !station) {
      return NextResponse.json(
        { error: 'order_id ve station gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Üretim emrini bul
    const order = db.prepare('SELECT * FROM production_orders WHERE id = ?').get(order_id) as ProductionOrderDetails | undefined
    if (!order) {
      return NextResponse.json({ error: 'Üretim emri bulunamadı' }, { status: 404 })
    }

    const currentStation = order.current_station || 'iskelet'
    
    // Eğer revert = true ise, geri çevirme işlemi yap
    if (revert === true) {
      // İskelet istasyonundan geriye dönülemez
      if (currentStation === 'iskelet') {
        return NextResponse.json(
          { error: 'Bu istasyondan geriye dönülemez' },
          { status: 400 }
        )
      }
      
      // Berjer istasyonu özel durum: Terzihane'den direkt geliyor, geri dönüşte de terzihane'ye gider
      let previousStation: string
      if (currentStation === 'berjer') {
        previousStation = 'terzihane'
      } else {
        // Diğer istasyonlar için normal sıralama
        const stationOrder = ['iskelet', 'terzihane', 'döseme', 'montaj', 'sevkiyat', 'completed']
        const currentIndex = stationOrder.indexOf(currentStation)
        if (currentIndex <= 0) {
          return NextResponse.json(
            { error: 'Bu istasyondan geriye dönülemez' },
            { status: 400 }
          )
        }
        previousStation = stationOrder[currentIndex - 1]
      }
      const now = new Date().toISOString()
      
      // Eğer kart bazlı geri çevirme varsa
      if (item_index !== undefined && item_total !== undefined) {
        // Tamamlanan kart sayacını azalt
        const completedCountColumn = `${currentStation}_completed_count`
        const currentCompleted = order[completedCountColumn] || 0
        
        if (currentCompleted > 0) {
          const newCompleted = currentCompleted - 1
          db.prepare(`UPDATE production_orders SET ${completedCountColumn} = ? WHERE id = ?`).run(newCompleted, order_id)
        }
      } else {
        // Tüm üretim emri geri çevriliyor, mevcut istasyonun completed_at zamanını temizle
        const completedAtColumn = `${currentStation}_completed_at`
        db.prepare(`UPDATE production_orders SET ${completedAtColumn} = NULL WHERE id = ?`).run(order_id)
      }
      
      // Üretim emrini önceki istasyona gönder
      db.prepare(`
        UPDATE production_orders 
        SET current_station = ?, updated_at = ?
        WHERE id = ?
      `).run(previousStation, now, order_id)
      
      return NextResponse.json({
        success: true,
        message: `Üretim emri ${previousStation} istasyonuna geri gönderildi`,
        current_station: previousStation
      })
    }
    
    // Eğer item_index ve item_total varsa, bu bir kart tamamlanmasıdır
    // Sadece bu kartı tamamla, tüm üretim emrini değil
    // Eğer item_index/item_total yoksa ama quantity > 1 ise, hata ver (güvenlik)
    if (item_index === undefined || item_total === undefined) {
      if (order.quantity > 1) {
        return NextResponse.json({
          error: `Bu üretim emri ${order.quantity} adet içeriyor. Lütfen kart numarasını belirtin.`,
          requires_item_index: true
        }, { status: 400 })
      }
      // quantity = 1 ise normal akışa devam et
    } else {
      // item_index ve item_total var, kart bazlı tamamlanma
      // Tamamlanan adet sayacını artır
      const completedCountColumn = `${currentStation}_completed_count`
      const currentCompleted = order[completedCountColumn] || 0
      const newCompleted = currentCompleted + 1
      
      // Sadece bu kartı tamamla
      db.prepare(`UPDATE production_orders SET ${completedCountColumn} = ? WHERE id = ?`).run(newCompleted, order_id)
      
      // Tüm kartlar tamamlandı mı kontrol et
      if (newCompleted >= order.quantity) {
        // Tüm kartlar tamamlandı, üretim emrini ilerlet
        // İstasyon tamamlanma zamanını kaydet
        const completedAtColumn = `${currentStation}_completed_at`
        const now = new Date().toISOString()
        db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ? WHERE id = ?`).run(now, order_id)
        // Normal akışa devam et (aşağıdaki kod çalışacak)
      } else {
        // Henüz tamamlanmayan kartlar var, sadece bu kartı tamamla
        return NextResponse.json({
          success: true,
          message: `Kart ${item_index}/${item_total} tamamlandı. Kalan: ${order.quantity - newCompleted} adet`,
          completed_count: newCompleted,
          total_quantity: order.quantity,
          all_completed: false
        })
      }
    } // item_index ve item_total varsa buraya gelmez, early return yapıyor
    
    // Ürün bilgisini al (berjer kontrolü için)
    const product = db.prepare('SELECT name FROM products WHERE id = ?').get(order.product_id) as ProductNameRow | undefined
    const isBerjer = product?.name && product.name.toLowerCase().includes('berjer')
    
    const stationOrder = ['iskelet', 'terzihane', 'döseme', 'montaj', 'berjer', 'sevkiyat', 'completed']
    const currentIndex = stationOrder.indexOf(currentStation)
    
    // Berjer için özel akış
    let nextIndex = currentIndex + 1
    if (isBerjer && currentStation === 'terzihane') {
      // Berjer ürünleri terzihane'den direkt berjer istasyonuna
      nextIndex = stationOrder.indexOf('berjer')
    } else if (isBerjer && currentStation === 'berjer') {
      // Berjer istasyonundan direkt mamül depoya (completed)
      nextIndex = stationOrder.indexOf('completed')
    } else if (currentStation === 'montaj') {
      // Montaj bitince direkt completed durumuna geç (sevkiyat'ı atla) ve mamül depoya al
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

    // Barkod generator'ı üstte statik import edildi

    db.transaction(() => {
      // İstasyon geçişi
      // Tüm kartlar tamamlandığında buraya geliyoruz
      let updateQuery = `UPDATE production_orders SET current_station = ?, updated_at = ?`
      const updateParams: Array<string | number | null> = [nextStation, now]

      // Önceki istasyonu tamamla (zaten completed_at kaydedildi, ama başlangıç zamanını kontrol et)
      if (currentStation === 'iskelet') {
        if (!order.iskelet_started_at) {
          updateQuery += `, iskelet_started_at = ?`
          updateParams.push(now)
        }
      } else if (currentStation === 'terzihane') {
        if (!order.terzihane_started_at) {
          updateQuery += `, terzihane_started_at = ?`
          updateParams.push(now)
        }
      } else if (currentStation === 'berjer') {
        if (!order.berjer_started_at) {
          updateQuery += `, berjer_started_at = ?`
          updateParams.push(now)
        }
      } else if (currentStation === 'döseme') {
        if (!order.döseme_started_at) {
          updateQuery += `, döseme_started_at = ?`
          updateParams.push(now)
        }
      } else if (currentStation === 'montaj') {
        if (!order.montaj_started_at) {
          updateQuery += `, montaj_started_at = ?`
          updateParams.push(now)
        }
      }
      
      // Tamamlanan kart sayacını sıfırla (yeni istasyona geçildi)
      const resetCountColumn = `${currentStation}_completed_count`
      updateQuery += `, ${resetCountColumn} = 0`

      // Sonraki istasyonu başlat
      if (nextStation === 'terzihane' && !order.terzihane_started_at) {
        updateQuery += `, terzihane_started_at = ?`
        updateParams.push(now)
      } else if (nextStation === 'berjer' && !order.berjer_started_at) {
        updateQuery += `, berjer_started_at = ?`
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
            b.unit as unit,
            COALESCE(b.fire_percentage, 0) as fire_percentage,
            m.name as material_name,
            m.stock_amount,
            m.unit as material_unit,
            m.reserved_quantity
          FROM bom b
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
          JOIN materials m ON b.material_id = m.id
          WHERE b.product_id = ? AND b.deleted_at IS NULL
        `).all(order.product_id)

        // Her malzeme için stok düş
        for (const item of bom) {
          const firePercentage = item.fire_percentage || 0
          const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
          const fromUnit = (item.unit || item.material_unit || '').toString()
          const toUnit = (item.material_unit || '').toString()
          const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
          const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
          const required = convertedQuantity * order.quantity

          // Stok kontrolü
          const available = (item.stock_amount || 0) - (item.reserved_quantity || 0)
          if (available < required) {
            // Stok yetersiz ama işlemi geri almayalım, sadece uyarı verelim
            console.warn(`Stok yetersiz: ${item.material_name}`)
          } else {
            // Stoku düş
            applyMaterialStockChange(db, item.material_id, -required)

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

      // Berjer istasyonundan direkt mamül depoya ekle
      if (currentStation === 'berjer' && nextStation === 'completed') {
        // Mevcut stoku al
      const currentStock = db
        .prepare('SELECT stock_amount FROM products WHERE id = ?')
        .get(order.product_id) as ProductStockRow | undefined
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
        `).all(order_id) as SerialStatusRow[]

        if (existingBarcodes.length === 0) {
          // Her ürün için barkod oluştur
          // Bugünkü barkod sayısını al
          const todayCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM product_serial_numbers
            WHERE DATE(created_at) = DATE('now')
          `).get() as BarcodeCountRow | undefined
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
            `Üretim Tamamlandı: ${order.order_number} - Berjer bitince mamül depoya eklendi`
          )
        } catch (movementError) {
          // stock_movements tablosunda product_id kolonu yoksa hata vermesin
          console.warn('Stok hareketi kaydedilemedi (opsiyonel):', movementError)
        }
      }
      
      // Montaj tamamlandığında direkt mamül depoya ekle
      if (currentStation === 'montaj' && nextStation === 'completed') {
        // Mevcut stoku al
        const currentStock = db
          .prepare('SELECT stock_amount FROM products WHERE id = ?')
          .get(order.product_id) as ProductStockRow | undefined
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
          `).all(order_id) as SerialStatusRow[]

        if (existingBarcodes.length === 0) {
          // Her ürün için barkod oluştur
          // Bugünkü barkod sayısını al
          const todayCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM product_serial_numbers
            WHERE DATE(created_at) = DATE('now')
          `).get() as BarcodeCountRow | undefined
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

