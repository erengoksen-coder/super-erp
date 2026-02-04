import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { generateBarcode, generateSerialNumber } from '@/lib/utils/barcodeGenerator'

type ProductionOrderRow = {
  production_order_id: string
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

type StationOrderCard = Omit<ProductionOrderRow, 'production_order_id'> & {
  id: string // production_order_id için
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
  barcode?: string | null
  serial_number?: string | null
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
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const station = searchParams.get('station') || 'iskelet'

    const db = getDatabase()

    // İstasyon sırası kontrolü
    const stationOrder = ['iskelet', 'terzihane', 'döseme', 'montaj', 'berjer', 'sevkiyat', 'completed']
    if (!stationOrder.includes(station)) {
      return NextResponse.json(
        { error: 'Geçersiz istasyon' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Kart bazlı takip: product_serial_numbers tablosundan oku
    // Her kartın kendi current_station'ı var
    const serialNumbers = db.prepare(`
      SELECT 
        psn.id as psn_id,
        psn.barcode,
        psn.serial_number,
        psn.current_station,
        psn.production_order_id as psn_production_order_id,
        po.id as production_order_id,
        po.order_number,
        po.quantity,
        po.status,
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
      FROM product_serial_numbers psn
      JOIN production_orders po ON psn.production_order_id = po.id
      JOIN products p ON po.product_id = p.id AND p.deleted_at IS NULL
      WHERE COALESCE(psn.current_station, po.current_station) = ?
        AND po.status != 'completed'
        AND po.status != 'cancelled'
      ORDER BY po.created_at ASC, psn.created_at ASC
    `).all(station) as Array<ProductionOrderRow & { psn_id: string; barcode: string | null; serial_number: string | null }>
    
    // Her kart için orders tablosundan bayi/müşteri bilgisini al
    // Aynı production_order_id'ye sahip kartları grupla ve item_index hesapla
    const ordersByProductionOrder = new Map<string, Array<typeof serialNumbers[0]>>()
    for (const sn of serialNumbers) {
      const poId = sn.production_order_id
      if (!poId) continue
      if (!ordersByProductionOrder.has(poId)) {
        ordersByProductionOrder.set(poId, [])
      }
      ordersByProductionOrder.get(poId)!.push(sn)
    }
    
    const orders: StationOrderCard[] = []
    for (const [poId, cards] of ordersByProductionOrder.entries()) {
      const firstCard = cards[0]
      const quantity = firstCard.quantity || cards.length
      
      // Orders tablosundan bayi/müşteri bilgisini al
      const orderInfo = db
        .prepare('SELECT dealer_name, customer_name, id, notes, configuration, product_name FROM active_orders WHERE production_order_id = ?')
        .get(poId) as OrderInfoRow | undefined
      
      // Her kart için ayrı bir order kartı oluştur
      cards.forEach((card, index) => {
        orders.push({
          id: card.production_order_id,
          order_number: card.order_number,
          quantity: quantity,
          status: card.status,
          current_station: card.current_station || station,
          created_at: card.created_at,
          iskelet_started_at: card.iskelet_started_at,
          iskelet_completed_at: card.iskelet_completed_at,
          terzihane_started_at: card.terzihane_started_at,
          terzihane_completed_at: card.terzihane_completed_at,
          berjer_started_at: card.berjer_started_at,
          berjer_completed_at: card.berjer_completed_at,
          döseme_started_at: card.döseme_started_at,
          döseme_completed_at: card.döseme_completed_at,
          montaj_started_at: card.montaj_started_at,
          montaj_completed_at: card.montaj_completed_at,
          sevkiyat_started_at: card.sevkiyat_started_at,
          sevkiyat_completed_at: card.sevkiyat_completed_at,
          product_name: card.product_name,
          product_sku: card.product_sku,
          dealer_name: orderInfo?.dealer_name || null,
          customer_name: orderInfo?.customer_name || null,
          order_id: orderInfo?.id || null,
          order_production_order_id: orderInfo ? poId : null,
          order_notes: orderInfo?.notes || null,
          order_configuration: orderInfo?.configuration || null,
          order_product_name: orderInfo?.product_name || null,
          item_index: index + 1, // 1'den başlayan index
          item_total: quantity, // Toplam adet
          display_quantity: 1, // Her kart 1 adet gösterir
          completed_count: (firstCard as Record<string, number | undefined>)[`${station}_completed_count`] || 0,
          barcode: card.barcode,
          serial_number: card.serial_number
        } as StationOrderCard)
      })
    }
    
    // Debug: İlk siparişin bayi/müşteri bilgisini logla
    if (orders.length > 0) {
      const firstOrder = orders[0]
      console.log('İstasyon siparişleri:', {
        station,
        total_cards: orders.length,
        unique_production_orders: ordersByProductionOrder.size,
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
    }, { headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('Station orders API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Sunucu hatası',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})

// PATCH: Üretim emrini bir sonraki istasyona geçir veya geri çevir
// TAMAMEN YENİDEN YAZILDI - HER DURUMDA GEÇERLİ RESPONSE DÖNDÜRÜR
export const PATCH = withAuth(async (request: NextRequest, user: any, context?: any) => {
  console.log('[PATCH] ========== REQUEST START ==========')
  
  try {
    // Request body parsing
    let body: any
    try {
      const text = await request.text()
      console.log('[PATCH] Request text length:', text.length)
      if (!text || text.trim() === '') {
        console.error('[PATCH] Empty request body')
        return NextResponse.json({ error: 'Request body is empty' }, { status: 400, headers: { 'Content-Type': 'application/json' } })
      }
      body = JSON.parse(text)
      console.log('[PATCH] Parsed body:', { order_id: body?.order_id, station: body?.station, item_index: body?.item_index, item_total: body?.item_total, revert: body?.revert })
    } catch (parseError: any) {
      console.error('[PATCH] JSON parse error:', parseError)
      return NextResponse.json({ 
        error: 'Geçersiz JSON formatı',
        details: parseError?.message || 'Invalid JSON'
      }, { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    
    const { order_id, station, notes, item_index, item_total, barcode, serial_number, revert } = body || {}

    if (!order_id || !station) {
      console.error('[PATCH] Missing required fields:', { order_id, station })
      return NextResponse.json(
        { error: 'order_id ve station gerekli' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Database connection
    let db
    try {
      db = getDatabase()
      console.log('[PATCH] Database connected')
    } catch (dbError: any) {
      console.error('[PATCH] Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Veritabanı bağlantı hatası',
        details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined
      }, { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    // Find production order
    let order: ProductionOrderDetails | undefined
    try {
      order = db.prepare('SELECT * FROM production_orders WHERE id = ?').get(order_id) as ProductionOrderDetails | undefined
      console.log('[PATCH] Order found:', order ? { id: order.id, order_number: order.order_number, quantity: order.quantity, current_station: order.current_station } : 'NOT FOUND')
    } catch (queryError: any) {
      console.error('[PATCH] Query error:', queryError)
      return NextResponse.json({ 
        error: 'Veritabanı sorgu hatası',
        details: process.env.NODE_ENV === 'development' ? queryError?.message : undefined
      }, { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    
    if (!order) {
      console.error('[PATCH] Order not found:', order_id)
      return NextResponse.json({ error: 'Üretim emri bulunamadı' }, { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    // Eğer revert = true ise, geri çevirme işlemi yap
    if (revert === true) {
      // Kart bazlı takipte, kartların gerçek current_station'ını kontrol et
      // Önce barcode veya serial_number ile kartı bul
      let cardBarcodeForCheck: { id: string; current_station: string | null } | undefined
      
      if (barcode || serial_number) {
        const whereClause = barcode 
          ? 'barcode = ? AND production_order_id = ?'
          : 'serial_number = ? AND production_order_id = ?'
        const param = barcode || serial_number
        
        cardBarcodeForCheck = db.prepare(`
          SELECT id, current_station
          FROM product_serial_numbers
          WHERE ${whereClause}
        `).get(param, order_id) as { id: string; current_station: string | null } | undefined
      } else if (item_index !== undefined && item_total !== undefined) {
        const barcodes = db.prepare(`
          SELECT id, current_station
          FROM product_serial_numbers
          WHERE production_order_id = ?
          ORDER BY created_at ASC
        `).all(order_id) as Array<{ id: string; current_station: string | null }>
        
        const barcodeIndex = item_index - 1
        cardBarcodeForCheck = barcodes[barcodeIndex]
      }
      
      // Kart bazlı takipte, kartın current_station'ını kullan
      // Eğer kart bulunamadıysa veya current_station NULL ise, station parametresini kullan
      const currentStation = cardBarcodeForCheck?.current_station || station || order.current_station || 'iskelet'
      
      console.log(`[PATCH REVERT] currentStation belirlendi:`, {
        cardBarcodeForCheck: cardBarcodeForCheck?.current_station,
        station,
        order_current_station: order.current_station,
        final_currentStation: currentStation
      })
      
      // İskelet istasyonundan geriye dönülemez
      if (currentStation === 'iskelet') {
        return NextResponse.json(
          { error: 'Bu istasyondan geriye dönülemez' },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
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
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        previousStation = stationOrder[currentIndex - 1]
      }
      const now = new Date().toISOString()
      
      // Kart bazlı geri çevirme - barcode veya serial_number ile kartı bul
      let cardBarcode: { id: string; barcode: string; serial_number: string } | undefined
      
      if (barcode || serial_number) {
        // Barcode veya serial_number ile doğrudan kartı bul
        const whereClause = barcode 
          ? 'barcode = ? AND production_order_id = ?'
          : 'serial_number = ? AND production_order_id = ?'
        const param = barcode || serial_number
        
        cardBarcode = db.prepare(`
          SELECT id, barcode, serial_number
          FROM product_serial_numbers
          WHERE ${whereClause}
            AND COALESCE(current_station, ?) = ?
        `).get(param, order_id, currentStation, currentStation) as { id: string; barcode: string; serial_number: string } | undefined
        
        if (!cardBarcode) {
          console.error(`[PATCH REVERT] Barcode/serial_number ile kart bulunamadı: barcode=${barcode}, serial_number=${serial_number}, order_id=${order_id}, current_station=${currentStation}`)
          return NextResponse.json({
            error: 'Belirtilen barkod/seri numarası ile bu istasyonda kart bulunamadı. Lütfen sayfayı yenileyin.'
          }, { status: 404, headers: { 'Content-Type': 'application/json' } })
        }
        
        console.log(`[PATCH REVERT] Barcode/serial_number ile kart bulundu: cardBarcode.id=${cardBarcode.id}`)
      } else if (item_index !== undefined && item_total !== undefined) {
        // item_index ile kartı bul
        const barcodes = db.prepare(`
          SELECT id, barcode, serial_number
          FROM product_serial_numbers
          WHERE production_order_id = ?
            AND COALESCE(current_station, ?) = ?
          ORDER BY created_at ASC
        `).all(order_id, currentStation, currentStation) as Array<{ id: string; barcode: string; serial_number: string }>
        
        const barcodeIndex = item_index - 1
        cardBarcode = barcodes[barcodeIndex]
        
        if (!cardBarcode) {
          console.error(`[PATCH REVERT] Kart bulunamadı: order_id=${order_id}, item_index=${item_index}, current_station=${currentStation}`)
          return NextResponse.json({
            error: `Kart ${item_index}/${item_total} için barkod bulunamadı. Lütfen sayfayı yenileyin.`
          }, { status: 404, headers: { 'Content-Type': 'application/json' } })
        }
        
        console.log(`[PATCH REVERT] item_index ile kart bulundu: cardBarcode.id=${cardBarcode.id}`)
      } else {
        // Tüm kartları geri çevir
        const allCards = db.prepare(`
          SELECT id, barcode, serial_number
          FROM product_serial_numbers
          WHERE production_order_id = ?
            AND COALESCE(current_station, ?) = ?
        `).all(order_id, currentStation, currentStation) as Array<{ id: string; barcode: string; serial_number: string }>
        
        if (allCards.length === 0) {
          return NextResponse.json({
            error: 'Bu istasyonda kart bulunamadı. Lütfen sayfayı yenileyin.'
          }, { status: 404, headers: { 'Content-Type': 'application/json' } })
        }
        
        // Tüm kartları geri çevir
        for (const card of allCards) {
          db.prepare(`
            UPDATE product_serial_numbers
            SET current_station = ?, updated_at = ?
            WHERE id = ?
          `).run(previousStation, now, card.id)
        }
        
        // Tüm üretim emri geri çevriliyor, mevcut istasyonun completed_at zamanını temizle
        const completedAtColumn = `${currentStation}_completed_at`
        db.prepare(`UPDATE production_orders SET ${completedAtColumn} = NULL WHERE id = ?`).run(order_id)
        
        // Üretim emrini önceki istasyona gönder
        db.prepare(`
          UPDATE production_orders 
          SET current_station = ?, updated_at = ?
          WHERE id = ?
        `).run(previousStation, now, order_id)
        
        return NextResponse.json({
          success: true,
          message: `Tüm kartlar ${previousStation} istasyonuna geri gönderildi`,
          current_station: previousStation
        }, { headers: { 'Content-Type': 'application/json' } })
      }
      
      // Tek bir kartı geri çevir
      if (cardBarcode) {
        // Bu kartı önceki istasyona gönder
        db.prepare(`
          UPDATE product_serial_numbers
          SET current_station = ?, updated_at = ?
          WHERE id = ?
        `).run(previousStation, now, cardBarcode.id)
        
        // Tamamlanan kart sayacını azalt
        const completedCountColumn = `${currentStation}_completed_count`
        const currentCompleted = order[completedCountColumn] || 0
        
        if (currentCompleted > 0) {
          const newCompleted = currentCompleted - 1
          db.prepare(`UPDATE production_orders SET ${completedCountColumn} = ? WHERE id = ?`).run(newCompleted, order_id)
        }
        
        // Eğer tüm kartlar geri çevrildiyse, production_order'ı da geri çevir
        const remainingCards = db.prepare(`
          SELECT COUNT(*) as count
          FROM product_serial_numbers
          WHERE production_order_id = ?
            AND COALESCE(current_station, ?) = ?
        `).get(order_id, currentStation, currentStation) as { count: number } | undefined
        
        if (!remainingCards || remainingCards.count === 0) {
          // Tüm kartlar geri çevrildi, production_order'ı da geri çevir
          db.prepare(`
            UPDATE production_orders 
            SET current_station = ?, updated_at = ?
            WHERE id = ?
          `).run(previousStation, now, order_id)
        }
        
        return NextResponse.json({
          success: true,
          message: `Kart ${previousStation} istasyonuna geri gönderildi`,
          current_station: previousStation
        }, { headers: { 'Content-Type': 'application/json' } })
      }
      
      return NextResponse.json({
        success: true,
        message: `Üretim emri ${previousStation} istasyonuna geri gönderildi`,
        current_station: previousStation
      }, { headers: { 'Content-Type': 'application/json' } })
    }
    
    // Normal işlem için currentStation'ı belirle
    // Kart bazlı takipte, kartın gerçek current_station'ını kullan
    // Eğer kart bulunamazsa, station parametresini veya order.current_station'ı kullan
    const currentStation = station || order.current_station || 'iskelet'
    console.log('[PATCH] Processing normal operation:', { currentStation, order_id, item_index, item_total, barcode, serial_number })
    
    // Kart bazlı takip - her zaman kart bazlı işlem yap
    // Önce barcode veya serial_number ile kartı bul (daha güvenli)
    let cardBarcode: { id: string; barcode: string; serial_number: string } | undefined
    
    if (barcode || serial_number) {
      // Barcode veya serial_number ile doğrudan kartı bul
      try {
        const whereClause = barcode 
          ? 'barcode = ? AND production_order_id = ?'
          : 'serial_number = ? AND production_order_id = ?'
        const param = barcode || serial_number
        
        cardBarcode = db.prepare(`
          SELECT id, barcode, serial_number
          FROM product_serial_numbers
          WHERE ${whereClause}
            AND COALESCE(current_station, ?) = ?
        `).get(param, order_id, currentStation, currentStation) as { id: string; barcode: string; serial_number: string } | undefined
        
        if (!cardBarcode) {
          console.error(`[PATCH] Barcode/serial_number ile kart bulunamadı: barcode=${barcode}, serial_number=${serial_number}, order_id=${order_id}, current_station=${currentStation}`)
          return NextResponse.json({
            error: 'Belirtilen barkod/seri numarası ile bu istasyonda kart bulunamadı. Lütfen sayfayı yenileyin.'
          }, { status: 404, headers: { 'Content-Type': 'application/json' } })
        }
        
        console.log(`[PATCH] Barcode/serial_number ile kart bulundu: cardBarcode.id=${cardBarcode.id}, barcode=${cardBarcode.barcode}, serial_number=${cardBarcode.serial_number}`)
        
        // Kart bulundu, şimdi nextStation belirle ve update yap
        // Ürün bilgisini al (berjer kontrolü için)
        let product: ProductNameRow | undefined
        try {
          product = db.prepare('SELECT name FROM products WHERE id = ? AND deleted_at IS NULL').get(order.product_id) as ProductNameRow | undefined
        } catch (productError: any) {
          console.error('[PATCH] Product query error:', productError)
          product = undefined
        }
        const isBerjer = product?.name && product.name.toLowerCase().includes('berjer')
        
        // Bir sonraki istasyonu belirle
        let nextStation: string
        if (currentStation === 'iskelet') {
          nextStation = 'terzihane'
        } else if (currentStation === 'terzihane') {
          nextStation = isBerjer ? 'berjer' : 'döseme'
        } else if (currentStation === 'döseme') {
          nextStation = 'montaj'
        } else if (currentStation === 'montaj') {
          nextStation = 'completed'
        } else if (currentStation === 'berjer') {
          nextStation = 'completed'
        } else {
          return NextResponse.json(
            { error: 'Geçersiz istasyon veya üretim tamamlandı' },
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        
        const now = new Date().toISOString()
        
        // Bu kartın current_station'ını bir sonraki istasyona güncelle
        try {
          console.log('[PATCH] Updating card:', { cardId: cardBarcode.id, currentStation, nextStation })
          
          // Kartı güncelle
          let cardUpdateResult
          if (nextStation === 'completed') {
            cardUpdateResult = db.prepare(`
              UPDATE product_serial_numbers
              SET current_station = ?, status = 'available', updated_at = ?
              WHERE id = ?
            `).run(nextStation, now, cardBarcode.id)
          } else {
            cardUpdateResult = db.prepare(`
              UPDATE product_serial_numbers
              SET current_station = ?, updated_at = ?
              WHERE id = ?
            `).run(nextStation, now, cardBarcode.id)
          }
          console.log('[PATCH] Card update result:', cardUpdateResult.changes)
          
          // Tamamlanan adet sayacını artır
          const completedCountColumn = `${currentStation}_completed_count`
          const currentCompleted = Number(
            (order as Record<string, number | null | undefined>)[completedCountColumn] || 0
          )
          const newCompleted = currentCompleted + 1
          console.log('[PATCH] Completed count:', { currentCompleted, newCompleted, column: completedCountColumn })
          
          // Sadece bu kartı tamamla
          const countUpdateResult = db.prepare(`UPDATE production_orders SET ${completedCountColumn} = ? WHERE id = ?`).run(newCompleted, order_id)
          console.log('[PATCH] Count update result:', countUpdateResult.changes)
          
          // Tamamlanma zamanını kaydet
          const completedAtColumn = `${currentStation}_completed_at`
          let timeUpdateResult
          if (nextStation === 'completed') {
            try {
              timeUpdateResult = db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`).run(now, now, now, order_id)
            } catch (updateError: any) {
              // Eğer completed_at kolonu yoksa, sadece diğer alanları güncelle
              if (updateError.message?.includes('no such column: completed_at')) {
                timeUpdateResult = db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, status = 'completed', updated_at = ? WHERE id = ?`).run(now, now, order_id)
              } else {
                throw updateError
              }
            }
          } else {
            timeUpdateResult = db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, updated_at = ? WHERE id = ?`).run(now, now, order_id)
          }
          console.log('[PATCH] Time update result:', timeUpdateResult.changes)
          
          const allCompleted = newCompleted >= order.quantity
          
          console.log('[PATCH] Update successful:', { newCompleted, total: order.quantity, allCompleted, nextStation })
          
          return NextResponse.json({
            success: true,
            message: allCompleted ? `Tüm kartlar tamamlandı` : `Kart ${nextStation} istasyonuna taşındı`,
            completed_count: newCompleted,
            total_quantity: order.quantity,
            all_completed: allCompleted,
            next_station: nextStation
          }, { headers: { 'Content-Type': 'application/json' } })
        } catch (dbError: any) {
          console.error('[PATCH] Database update error:', dbError)
          console.error('[PATCH] Database update error stack:', dbError?.stack)
          console.error('[PATCH] Database update error details:', {
            message: dbError?.message,
            code: dbError?.code,
            errno: dbError?.errno
          })
          return NextResponse.json({ 
            error: 'Veritabanı güncelleme hatası',
            details: process.env.NODE_ENV === 'development' ? (dbError?.message || dbError?.toString()) : undefined
          }, { status: 500, headers: { 'Content-Type': 'application/json' } })
        }
      } catch (barcodeQueryError: any) {
        console.error('[PATCH] Barcode query error:', barcodeQueryError)
        return NextResponse.json({
          error: 'Kart sorgusu hatası',
          details: process.env.NODE_ENV === 'development' ? barcodeQueryError?.message : undefined
        }, { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
    } else if (item_index === undefined || item_total === undefined) {
      // Barcode/serial_number yoksa, item_index kullan veya quantity = 1 ise ilk kartı bul
      if (order.quantity > 1) {
        return NextResponse.json({
          error: `Bu üretim emri ${order.quantity} adet içeriyor. Lütfen kart numarasını belirtin.`,
          requires_item_index: true
        }, { status: 400, headers: { 'Content-Type': 'application/json' } })
      }
      // quantity = 1 ise, ilk (ve tek) kartı bul
      let singleBarcode: { id: string; barcode: string; serial_number: string } | undefined
      try {
        singleBarcode = db.prepare(`
          SELECT id, barcode, serial_number
          FROM product_serial_numbers
          WHERE production_order_id = ?
            AND COALESCE(current_station, ?) = ?
          ORDER BY created_at ASC
          LIMIT 1
        `).get(order_id, currentStation, currentStation) as { id: string; barcode: string; serial_number: string } | undefined
      } catch (singleBarcodeError: any) {
        console.error('[PATCH] Single barcode query error:', singleBarcodeError)
        return NextResponse.json({
          error: 'Kart sorgusu hatası',
          details: process.env.NODE_ENV === 'development' ? singleBarcodeError?.message : undefined
        }, { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
      
      if (!singleBarcode) {
        console.error('[PATCH] Single barcode not found:', { order_id, currentStation })
        return NextResponse.json({
          error: 'Bu üretim emri için bu istasyonda barkod bulunamadı'
        }, { status: 404, headers: { 'Content-Type': 'application/json' } })
      }
      
      cardBarcode = singleBarcode
      console.log('[PATCH] Single barcode found:', cardBarcode.id)
      
      // Ürün bilgisini al (berjer kontrolü için)
      let product: ProductNameRow | undefined
      try {
        product = db.prepare('SELECT name FROM products WHERE id = ? AND deleted_at IS NULL').get(order.product_id) as ProductNameRow | undefined
      } catch (productError: any) {
        console.error('[PATCH] Product query error:', productError)
        product = undefined
      }
      const isBerjer = product?.name && product.name.toLowerCase().includes('berjer')
      
      // Bir sonraki istasyonu belirle
      let nextStation: string
      if (currentStation === 'iskelet') {
        nextStation = 'terzihane'
      } else if (currentStation === 'terzihane') {
        nextStation = isBerjer ? 'berjer' : 'döseme'
      } else if (currentStation === 'döseme') {
        nextStation = 'montaj'
      } else if (currentStation === 'montaj') {
        nextStation = 'completed'
      } else if (currentStation === 'berjer') {
        nextStation = 'completed'
      } else {
        return NextResponse.json(
          { error: 'Geçersiz istasyon veya üretim tamamlandı' },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      const now = new Date().toISOString()
      
      // Bu kartın current_station'ını bir sonraki istasyona güncelle
      // Eğer completed istasyonuna geçiliyorsa, status'u da 'available' yap (mamül depoda görünsün)
      try {
        if (nextStation === 'completed') {
          db.prepare(`
            UPDATE product_serial_numbers
            SET current_station = ?, status = 'available', updated_at = ?
            WHERE id = ?
          `).run(nextStation, now, cardBarcode.id)
        } else {
          db.prepare(`
            UPDATE product_serial_numbers
            SET current_station = ?, updated_at = ?
            WHERE id = ?
          `).run(nextStation, now, cardBarcode.id)
        }
        
        // Tamamlanan adet sayacını artır
        const completedCountColumn = `${currentStation}_completed_count`
        const currentCompleted = Number(
          (order as Record<string, number | null | undefined>)[completedCountColumn] || 0
        )
        const newCompleted = currentCompleted + 1
        
        // Sadece bu kartı tamamla
        db.prepare(`UPDATE production_orders SET ${completedCountColumn} = ? WHERE id = ?`).run(newCompleted, order_id)
        
        // Tamamlanma zamanını kaydet
        // Eğer montaj istasyonundan completed'e geçiliyorsa, production_order status'unu da güncelle
        const completedAtColumn = `${currentStation}_completed_at`
        if (nextStation === 'completed') {
          try {
            db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`).run(now, now, now, order_id)
          } catch (updateError: any) {
            // Eğer completed_at kolonu yoksa, sadece diğer alanları güncelle
            if (updateError.message?.includes('no such column: completed_at')) {
              db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, status = 'completed', updated_at = ? WHERE id = ?`).run(now, now, order_id)
            } else {
              throw updateError
            }
          }
        } else {
          db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, updated_at = ? WHERE id = ?`).run(now, now, order_id)
        }
        
        return NextResponse.json({
          success: true,
          message: `Ürün ${nextStation} istasyonuna taşındı`,
          completed_count: newCompleted,
          total_quantity: order.quantity,
          all_completed: true,
          next_station: nextStation
        }, { headers: { 'Content-Type': 'application/json' } })
      } catch (dbError: any) {
        console.error('[PATCH] Database update error:', dbError)
        return NextResponse.json({ 
          error: 'Veritabanı güncelleme hatası',
          details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined
        }, { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
    } else if (item_index !== undefined && item_total !== undefined) {
      // item_index ve item_total var, kart bazlı tamamlanma
      // Bu kartın barkodunu bul - sadece mevcut istasyondaki kartları al
      let barcodes: Array<{ id: string; barcode: string; serial_number: string }>
      try {
        barcodes = db.prepare(`
          SELECT id, barcode, serial_number
          FROM product_serial_numbers
          WHERE production_order_id = ?
            AND COALESCE(current_station, ?) = ?
          ORDER BY created_at ASC
        `).all(order_id, currentStation, currentStation) as Array<{ id: string; barcode: string; serial_number: string }>
      } catch (barcodeQueryError: any) {
        console.error('[PATCH] Barcode query error:', barcodeQueryError)
        return NextResponse.json({
          error: 'Kart sorgusu hatası',
          details: process.env.NODE_ENV === 'development' ? barcodeQueryError?.message : undefined
        }, { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
      
      // item_index 1'den başlıyor, array index 0'dan başlıyor
      const barcodeIndex = item_index - 1
      cardBarcode = barcodes[barcodeIndex]
      
      if (!cardBarcode) {
        console.error(`[PATCH] Kart bulunamadı: order_id=${order_id}, item_index=${item_index}, current_station=${currentStation}, barcodes.length=${barcodes.length}`)
        return NextResponse.json({
          error: `Kart ${item_index}/${item_total} için barkod bulunamadı. Lütfen sayfayı yenileyin.`
        }, { status: 404, headers: { 'Content-Type': 'application/json' } })
      }
      
      console.log(`[PATCH] item_index ile kart bulundu: cardBarcode.id=${cardBarcode.id}, barcode=${cardBarcode.barcode}, serial_number=${cardBarcode.serial_number}, item_index=${item_index}`)
      
      // Ürün bilgisini al (berjer kontrolü için)
      let product: ProductNameRow | undefined
      try {
        product = db.prepare('SELECT name FROM products WHERE id = ? AND deleted_at IS NULL').get(order.product_id) as ProductNameRow | undefined
      } catch (productError: any) {
        console.error('[PATCH] Product query error:', productError)
        product = undefined
      }
      const isBerjer = product?.name && product.name.toLowerCase().includes('berjer')
      
      // Bir sonraki istasyonu belirle
      let nextStation: string
      if (currentStation === 'iskelet') {
        nextStation = 'terzihane'
      } else if (currentStation === 'terzihane') {
        nextStation = isBerjer ? 'berjer' : 'döseme'
      } else if (currentStation === 'döseme') {
        nextStation = 'montaj'
      } else if (currentStation === 'montaj') {
        nextStation = 'completed'
      } else if (currentStation === 'berjer') {
        nextStation = 'completed'
      } else {
        return NextResponse.json(
          { error: 'Geçersiz istasyon veya üretim tamamlandı' },
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      const now = new Date().toISOString()
      
      // Bu kartın current_station'ını bir sonraki istasyona güncelle
      // Eğer completed istasyonuna geçiliyorsa, status'u da 'available' yap (mamül depoda görünsün)
      try {
        let updateResult
        if (nextStation === 'completed') {
          updateResult = db.prepare(`
            UPDATE product_serial_numbers
            SET current_station = ?, status = 'available', updated_at = ?
            WHERE id = ?
          `).run(nextStation, now, cardBarcode.id)
        } else {
          updateResult = db.prepare(`
            UPDATE product_serial_numbers
            SET current_station = ?, updated_at = ?
            WHERE id = ?
          `).run(nextStation, now, cardBarcode.id)
        }
        
        // Güncelleme başarılı mı kontrol et
        if (updateResult.changes === 0) {
          console.error(`[PATCH] Kart güncellenemedi: cardBarcode.id=${cardBarcode.id}, nextStation=${nextStation}`)
          return NextResponse.json({
            error: 'Kart güncellenemedi. Lütfen sayfayı yenileyin ve tekrar deneyin.'
          }, { status: 500, headers: { 'Content-Type': 'application/json' } })
        }
        
        console.log(`[PATCH] Kart güncellendi: cardBarcode.id=${cardBarcode.id}, current_station=${currentStation} -> nextStation=${nextStation}, changes=${updateResult.changes}`)
        
        // Tamamlanan adet sayacını artır
        const completedCountColumn = `${currentStation}_completed_count`
        const currentCompleted = Number(
          (order as Record<string, number | null | undefined>)[completedCountColumn] || 0
        )
        const newCompleted = currentCompleted + 1
        
        // Sadece bu kartı tamamla
        db.prepare(`UPDATE production_orders SET ${completedCountColumn} = ? WHERE id = ?`).run(newCompleted, order_id)
        
        // Tüm kartlar tamamlandı mı kontrol et
        if (newCompleted >= order.quantity) {
          // Tüm kartlar tamamlandı, tamamlanma zamanını kaydet
          // Eğer montaj istasyonundan completed'e geçiliyorsa, production_order status'unu da güncelle
          const completedAtColumn = `${currentStation}_completed_at`
          if (nextStation === 'completed') {
            db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`).run(now, now, now, order_id)
          } else {
            db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, updated_at = ? WHERE id = ?`).run(now, now, order_id)
          }
          
          return NextResponse.json({
            success: true,
            message: `Tüm kartlar tamamlandı. Son kart ${nextStation} istasyonuna taşındı`,
            completed_count: newCompleted,
            total_quantity: order.quantity,
            all_completed: true,
            next_station: nextStation
          }, { headers: { 'Content-Type': 'application/json' } })
        } else {
          // Henüz tamamlanmayan kartlar var, sadece bu kartı bir sonraki istasyona taşı
          // Diğer kartlar aynı terminalde kalacak
          return NextResponse.json({
            success: true,
            message: `Kart ${item_index}/${item_total} tamamlandı ve ${nextStation} istasyonuna taşındı. Kalan ${order.quantity - newCompleted} adet ${currentStation} istasyonunda`,
            completed_count: newCompleted,
            total_quantity: order.quantity,
            all_completed: false,
            next_station: nextStation
          }, { headers: { 'Content-Type': 'application/json' } })
        }
      } catch (dbError: any) {
        console.error('[PATCH] Database update error:', dbError)
        return NextResponse.json({ 
          error: 'Veritabanı güncelleme hatası',
          details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined
        }, { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
    } else {
      // Bu kısma gelmemeli - tüm durumlar yukarıda handle edildi
      // Güvenlik için: Eğer buraya gelirse, hata ver
      console.error('[PATCH] Unhandled code path - this should never happen')
      return NextResponse.json({
        error: 'Kart bazlı takip hatası: Bu durum handle edilmedi. Lütfen item_index ve item_total parametrelerini gönderin.'
      }, { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    
    // Fallback - eğer hiçbir return'a ulaşılmazsa (bu asla olmamalı)
    console.error('[PATCH] CRITICAL: No return statement reached - this should never happen!')
    return NextResponse.json({
      error: 'Beklenmeyen durum: Handler response döndürmedi'
    }, { status: 500, headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('[PATCH] Unexpected error:', error)
    const errorMessage = error?.message || error?.toString() || 'Beklenmeyen bir hata oluştu'
    try {
      return NextResponse.json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (responseError: any) {
      // Eğer NextResponse.json bile başarısız olursa, basit bir response döndür
      console.error('[PATCH] Response creation error:', responseError)
      return new Response(JSON.stringify({ 
        error: errorMessage 
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }
  }
})

