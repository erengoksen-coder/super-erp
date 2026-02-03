import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
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
      JOIN active_products p ON po.product_id = p.id
      WHERE po.current_station = ?
        AND po.status != 'completed'
        AND po.status != 'cancelled'
      ORDER BY po.created_at ASC
    `).all(station) as ProductionOrderRow[]
    
    // Her üretim emri için orders tablosundan bayi/müşteri bilgisini al
    productionOrders = productionOrders.map((po) => {
      const orderInfo = db
        .prepare('SELECT dealer_name, customer_name, id, notes, configuration, product_name FROM active_orders WHERE production_order_id = ?')
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
})

// PATCH: Üretim emrini bir sonraki istasyona geçir veya geri çevir
export const PATCH = withAuth(async (request: NextRequest) => {
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
    
    // Kart bazlı takip - her zaman kart bazlı işlem yap
    // Eğer item_index/item_total yoksa ama quantity > 1 ise, hata ver
    if (item_index === undefined || item_total === undefined) {
      if (order.quantity > 1) {
        return NextResponse.json({
          error: `Bu üretim emri ${order.quantity} adet içeriyor. Lütfen kart numarasını belirtin.`,
          requires_item_index: true
        }, { status: 400 })
      }
      // quantity = 1 ise, ilk (ve tek) kartı bul
      const singleBarcode = db.prepare(`
        SELECT id, barcode, serial_number
        FROM product_serial_numbers
        WHERE production_order_id = ?
        ORDER BY created_at ASC
        LIMIT 1
      `).get(order_id) as { id: string; barcode: string; serial_number: string } | undefined
      
      if (!singleBarcode) {
        return NextResponse.json({
          error: 'Bu üretim emri için barkod bulunamadı'
        }, { status: 404 })
      }
      
      // Ürün bilgisini al (berjer kontrolü için)
      const product = db.prepare('SELECT name FROM active_products WHERE id = ?').get(order.product_id) as ProductNameRow | undefined
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
          { status: 400 }
        )
      }
      
      const now = new Date().toISOString()
      
      // Bu kartın current_station'ını bir sonraki istasyona güncelle
      db.prepare(`
        UPDATE product_serial_numbers
        SET current_station = ?, updated_at = ?
        WHERE id = ?
      `).run(nextStation, now, singleBarcode.id)
      
      // Tamamlanan adet sayacını artır
      const completedCountColumn = `${currentStation}_completed_count`
      const currentCompleted = Number(
        (order as Record<string, number | null | undefined>)[completedCountColumn] || 0
      )
      const newCompleted = currentCompleted + 1
      
      // Sadece bu kartı tamamla
      db.prepare(`UPDATE production_orders SET ${completedCountColumn} = ? WHERE id = ?`).run(newCompleted, order_id)
      
      // Tamamlanma zamanını kaydet
      const completedAtColumn = `${currentStation}_completed_at`
      db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, updated_at = ? WHERE id = ?`).run(now, now, order_id)
      
      // Üretim emrinin current_station'ını GÜNCELLEME - kart bağımsız ilerliyor
      
      return NextResponse.json({
        success: true,
        message: `Ürün ${nextStation} istasyonuna taşındı`,
        completed_count: newCompleted,
        total_quantity: order.quantity,
        all_completed: true,
        next_station: nextStation
      })
    } else {
      // item_index ve item_total var, kart bazlı tamamlanma
      // Bu kartın barkodunu bul
      const barcodes = db.prepare(`
        SELECT id, barcode, serial_number
        FROM product_serial_numbers
        WHERE production_order_id = ?
        ORDER BY created_at ASC
      `).all(order_id) as Array<{ id: string; barcode: string; serial_number: string }>
      
      // item_index 1'den başlıyor, array index 0'dan başlıyor
      const barcodeIndex = item_index - 1
      const cardBarcode = barcodes[barcodeIndex]
      
      if (!cardBarcode) {
        return NextResponse.json({
          error: `Kart ${item_index}/${item_total} için barkod bulunamadı`
        }, { status: 404 })
      }
      
      // Ürün bilgisini al (berjer kontrolü için)
      const product = db.prepare('SELECT name FROM active_products WHERE id = ?').get(order.product_id) as ProductNameRow | undefined
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
          { status: 400 }
        )
      }
      
      const now = new Date().toISOString()
      
      // Bu kartın current_station'ını bir sonraki istasyona güncelle
      db.prepare(`
        UPDATE product_serial_numbers
        SET current_station = ?, updated_at = ?
        WHERE id = ?
      `).run(nextStation, now, cardBarcode.id)
      
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
        // Tüm kartlar tamamlandı, sadece tamamlanma zamanını kaydet
        // Üretim emrinin current_station'ını GÜNCELLEME - kartlar bağımsız ilerliyor
        const completedAtColumn = `${currentStation}_completed_at`
        db.prepare(`UPDATE production_orders SET ${completedAtColumn} = ?, updated_at = ? WHERE id = ?`).run(now, now, order_id)
        
        return NextResponse.json({
          success: true,
          message: `Tüm kartlar tamamlandı. Son kart ${nextStation} istasyonuna taşındı`,
          completed_count: newCompleted,
          total_quantity: order.quantity,
          all_completed: true,
          next_station: nextStation
        })
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
        })
      }
    } // item_index ve item_total varsa buraya gelmez, early return yapıyor
    
    // Bu kısma gelmemeli - tüm durumlar yukarıda handle edildi
    // Güvenlik için: Eğer buraya gelirse, hata ver
    return NextResponse.json({
      error: 'Kart bazlı takip hatası: Bu durum handle edilmedi. Lütfen item_index ve item_total parametrelerini gönderin.'
    }, { status: 500 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

