import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

/**
 * İstasyon Geçiş API
 * Barkod okutarak üretim emrini bir sonraki istasyona geçirir
 * Döşeme aşamasına geçildiğinde otomatik stok düşümü yapar
 */

// POST: Barkod okutarak istasyon geçişi
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { barcode, station } = body

    if (!barcode) {
      return NextResponse.json({ error: 'Barkod gerekli' }, { status: 400 })
    }

    const db = getDatabase()

    // Barkod ile üretim emrini bul
    const serialNumber = db.prepare(`
      SELECT psn.*, po.*, p.name as product_name, p.sku
      FROM product_serial_numbers psn
      JOIN production_orders po ON psn.production_order_id = po.id
      JOIN products p ON po.product_id = p.id
      WHERE psn.barcode = ? OR psn.serial_number = ?
      LIMIT 1
    `).get(barcode, barcode) as any

    if (!serialNumber) {
      return NextResponse.json({ error: 'Barkod bulunamadı' }, { status: 404 })
    }

    const productionOrderId = serialNumber.production_order_id
    const currentStation = serialNumber.current_station || 'iskelet'

    // İstasyon sırası
    const stationOrder = ['iskelet', 'terzihane', 'berjer', 'döseme', 'montaj', 'sevkiyat', 'completed']
    const currentIndex = stationOrder.indexOf(currentStation)
    const nextIndex = currentIndex + 1

    if (nextIndex >= stationOrder.length) {
      return NextResponse.json({ 
        error: 'Üretim tamamlandı, başka istasyon yok',
        current_station: currentStation 
      }, { status: 400 })
    }

    const nextStation = station || stationOrder[nextIndex]
    const now = new Date().toISOString()

    // İstasyon geçişi
    let updateQuery = `UPDATE production_orders SET current_station = ?, updated_at = ?`
    const updateParams: any[] = [nextStation, now]

    // İstasyon başlangıç/bitiş zamanlarını kaydet
    if (nextStation === 'terzihane' && !serialNumber.terzihane_started_at) {
      updateQuery += `, terzihane_started_at = ?`
      updateParams.push(now)
    } else if (nextStation === 'berjer' && !serialNumber.berjer_started_at) {
      updateQuery += `, berjer_started_at = ?`
      updateParams.push(now)
      if (!serialNumber.terzihane_completed_at) {
        updateQuery += `, terzihane_completed_at = ?`
        updateParams.push(now)
      }
    } else if (nextStation === 'döseme' && !serialNumber.döseme_started_at) {
      updateQuery += `, döseme_started_at = ?`
      updateParams.push(now)
      if (!serialNumber.terzihane_completed_at) {
        updateQuery += `, terzihane_completed_at = ?`
        updateParams.push(now)
      }
    } else if (nextStation === 'montaj' && !serialNumber.montaj_started_at) {
      updateQuery += `, montaj_started_at = ?`
      updateParams.push(now)
      if (!serialNumber.döseme_completed_at) {
        updateQuery += `, döseme_completed_at = ?`
        updateParams.push(now)
      }
    } else if (nextStation === 'sevkiyat' && !serialNumber.sevkiyat_started_at) {
      updateQuery += `, sevkiyat_started_at = ?`
      updateParams.push(now)
      if (!serialNumber.montaj_completed_at) {
        updateQuery += `, montaj_completed_at = ?`
        updateParams.push(now)
      }
    } else if (nextStation === 'completed') {
      updateQuery += `, status = 'completed', sevkiyat_completed_at = ?`
      updateParams.push(now)
      if (!serialNumber.sevkiyat_completed_at) {
        updateQuery += `, completed_at = ?`
        updateParams.push(now)
      }
    }

    // Önceki istasyonu tamamla
    if (currentStation === 'iskelet' && nextStation === 'terzihane') {
      updateQuery += `, iskelet_completed_at = ?`
      updateParams.push(now)
    } else if (currentStation === 'terzihane' && nextStation === 'döseme') {
      updateQuery += `, terzihane_completed_at = ?`
      updateParams.push(now)
    } else if (currentStation === 'terzihane' && nextStation === 'berjer') {
      updateQuery += `, terzihane_completed_at = ?`
      updateParams.push(now)
    } else if (currentStation === 'berjer' && nextStation === 'completed') {
      updateQuery += `, berjer_completed_at = ?`
      updateParams.push(now)
    }

    updateQuery += ` WHERE id = ?`
    updateParams.push(productionOrderId)

    // Döşeme aşamasına geçildiğinde otomatik stok düşümü
    if (nextStation === 'döseme' && serialNumber.stock_deducted === 0) {
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
      `).all(serialNumber.product_id)

      // Her malzeme için stok düş
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
        const required = quantityWithFire * serialNumber.quantity

        // Stok kontrolü
        if (item.stock_amount < required) {
          return NextResponse.json({
            error: `Stok yetersiz: ${item.material_name} (Gereken: ${required.toFixed(2)} ${item.unit}, Mevcut: ${item.stock_amount} ${item.unit})`,
            current_station: currentStation
          }, { status: 400 })
        }

        // Stoku düş
        const newStock = item.stock_amount - required
        db.prepare('UPDATE materials SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newStock, item.material_id)

        // Stok hareketi kaydı
        const movementId = require('crypto').randomUUID()
        db.prepare(`
          INSERT INTO stock_movements 
          (id, material_id, movement_type, quantity, reference_type, reference_id, notes)
          VALUES (?, ?, 'out', ?, 'production', ?, ?)
        `).run(
          movementId,
          item.material_id,
          -required,
          productionOrderId,
          `Üretim: ${serialNumber.product_name} - Döşeme aşaması (Fire: ${firePercentage}%)`
        )
      }

      // Stok düşümü yapıldı işaretle
      updateQuery += `, stock_deducted = 1`
    }

    db.prepare(updateQuery).run(...updateParams)

    // Güncel durumu getir
    const updatedOrder = db.prepare(`
      SELECT po.*, p.name as product_name, p.sku
      FROM production_orders po
      JOIN products p ON po.product_id = p.id
      WHERE po.id = ?
    `).get(productionOrderId) as any

    return NextResponse.json({
      success: true,
      message: `İstasyon geçişi başarılı: ${currentStation} -> ${nextStation}`,
      production_order: updatedOrder,
      previous_station: currentStation,
      current_station: nextStation,
      stock_deducted: nextStation === 'döseme' && serialNumber.stock_deducted === 0
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET: İstasyon bazlı istatistikler (darboğaz analizi)
export async function GET() {
  try {
    const db = getDatabase()
    
    const stats = db.prepare(`
      SELECT 
        current_station,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM production_orders
      WHERE status != 'completed' AND status != 'cancelled'
      GROUP BY current_station
    `).all()

    const stationOrder = ['iskelet', 'terzihane', 'berjer', 'döseme', 'montaj', 'sevkiyat']
    const stationNames: Record<string, string> = {
      iskelet: 'İskelet',
      terzihane: 'Terzihane',
      berjer: 'Berjer',
      döseme: 'Döşeme',
      montaj: 'Montaj',
      sevkiyat: 'Sevkiyat',
    }
    const formattedStats = stationOrder.map(station => {
      const stat = stats.find((s: any) => s.current_station === station)
      return {
        station,
        station_name: stationNames[station] || station,
        count: stat?.count || 0,
        total_quantity: stat?.total_quantity || 0
      }
    })

    // En çok biriken istasyon (darboğaz)
    const bottleneck = formattedStats.reduce((max, stat) => 
      stat.count > max.count ? stat : max, 
      formattedStats[0] || { station: '', station_name: '', count: 0, total_quantity: 0 }
    )

    return NextResponse.json({
      stations: formattedStats,
      bottleneck: bottleneck.count > 0 ? bottleneck : null,
      total_pending: formattedStats.reduce((sum, s) => sum + s.count, 0)
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

