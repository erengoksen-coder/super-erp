import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { applyMaterialStockChange } from '@/lib/materials/stock'

/**
 * İstasyon Geçiş API
 * Barkod okutarak üretim emrini bir sonraki istasyona geçirir
 * Döşeme aşamasına geçildişinde otomatik stok düşümü yapar
 */

// POST: Barkod okutarak istasyon geçişi
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
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
      JOIN active_products p ON po.product_id = p.id
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

    // �nceki istasyonu tamamla
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

    // Döşeme aşamasına geçildişinde otomatik stok düşümü
    if (nextStation === 'döseme' && serialNumber.stock_deducted === 0) {
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
      `).all(serialNumber.product_id) as any[]

      // Her malzeme için stok düş
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
        const fromUnit = (item.unit || item.material_unit || '').toString()
        const toUnit = (item.material_unit || '').toString()
        const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
        const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
        const required = convertedQuantity * serialNumber.quantity

        // Stok kontrolü
        const available = (item.stock_amount || 0) - (item.reserved_quantity || 0)
        if (available < required) {
          return NextResponse.json({
            error: `Stok yetersiz: ${item.material_name} (Gereken: ${required.toFixed(2)} ${item.material_unit}, Mevcut: ${item.stock_amount} ${item.material_unit})`,
            current_station: currentStation
          }, { status: 400 })
        }

        // Stoku düş
        applyMaterialStockChange(db, item.material_id, -required)

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
      JOIN active_products p ON po.product_id = p.id
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
})

// GET: İstasyon bazlı istatistikler (darboşaz analizi)
export const GET = withAuth(async (request) => {
  try {
    const db = getDatabase()
    
    // Barkod yönetimi ile uyumlu: Bekleyen = üretim emri atanmış ama henüz istasyona girmemiş (barkod listesi ile aynı kapsam)
      const pendingStats = db.prepare(`
        SELECT COUNT(psn.id) as count FROM product_serial_numbers psn
        WHERE psn.status = 'pending'
          AND psn.production_order_id IS NOT NULL AND psn.production_order_id != ''
      `).get() as { count: number }
      const pendingCount = Number((pendingStats as any).count ?? 0)

      // Aktif istasyonlar: üretim emrine bağlı kartlar
      const activeStats = db.prepare(`
        SELECT 
          COALESCE(psn.current_station, po.current_station) as station,
          COUNT(psn.id) as count,
          COUNT(psn.id) as total_quantity
        FROM product_serial_numbers psn
        JOIN production_orders po ON psn.production_order_id = po.id
        WHERE po.status != 'completed' 
          AND po.status != 'cancelled'
          AND COALESCE(psn.current_station, po.current_station) IS NOT NULL
        GROUP BY COALESCE(psn.current_station, po.current_station)
      `).all() as Array<{ station: string | null; count: number | null; total_quantity: number | null }>
      
      // Barkodsuz üretim emirleri (Devam Eden) - istasyon sayılarına ekle
      const noBarcodeStats = db.prepare(`
        SELECT 
          COALESCE(po.current_station, 'iskelet') as station,
          COUNT(po.id) as po_count,
          COALESCE(SUM(po.quantity), 0) as total_quantity
        FROM production_orders po
        WHERE po.deleted_at IS NULL
          AND po.status != 'completed'
          AND po.status != 'cancelled'
          AND NOT EXISTS (SELECT 1 FROM product_serial_numbers psn WHERE psn.production_order_id = po.id)
        GROUP BY COALESCE(po.current_station, 'iskelet')
      `).all() as Array<{ station: string; po_count: number; total_quantity: number }>
      
      for (const row of noBarcodeStats) {
        const existing = activeStats.find((s) => s.station === row.station)
        const addCount = Number(row.po_count ?? 0)
        const addQty = Number(row.total_quantity ?? 0)
        if (existing) {
          existing.count = (existing.count ?? 0) + addCount
          existing.total_quantity = (existing.total_quantity ?? 0) + addQty
        } else {
          activeStats.push({ station: row.station, count: addCount, total_quantity: addQty })
        }
      }
      
      // Mamül Depo: barkod yönetimi ile aynı mantık - depoda/sevk edilmemiş tüm mamüller (JOIN şartı yok)
      const completedStats = db.prepare(`
        SELECT COUNT(id) as count FROM product_serial_numbers psn
        WHERE psn.status IN ('available', 'in_stock')
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
      `).get() as { count: number | null }
      const completedCount = Number(completedStats?.count ?? 0)
      
      // Sevkiyat (shipped) için sayım
      const shippedStats = db.prepare(`
        SELECT COUNT(id) as count FROM product_serial_numbers psn
        WHERE psn.shipment_id IS NOT NULL AND psn.shipment_id != ''
      `).get() as { count: number | null }
      const shippedCount = Number(shippedStats?.count ?? 0)
      
      const stats: Array<{ station: string | null; count: number | null; total_quantity: number | null }> = [
        { station: 'pending', count: pendingCount, total_quantity: pendingCount }
      ]
      stats.push(...activeStats)
      if (shippedCount > 0) {
        stats.push({ station: 'sevkiyat', count: shippedCount, total_quantity: shippedCount })
      }
      if (completedCount > 0) {
        stats.push({ station: 'completed', count: completedCount, total_quantity: completedCount })
      }

    const stationOrder = ['pending', 'iskelet', 'terzihane', 'berjer', 'döseme', 'montaj', 'sevkiyat', 'completed']
    const stationNames: Record<string, string> = {
      pending: 'Bekleyen',
      iskelet: 'İskelet',
      terzihane: 'Terzihane',
      berjer: 'Berjer',
      döseme: 'Döşeme',
      montaj: 'Montaj',
      sevkiyat: 'Sevkiyat',
      completed: 'Mamül Depo',
    }
    const formattedStats = stationOrder.map(station => {
      const stat = stats.find((s: any) => s.station === station)
      return {
        station,
        station_name: stationNames[station] || station,
        count: stat?.count || 0,
        total_quantity: stat?.total_quantity || 0
      }
    })

    // En çok biriken istasyon (darboşaz)
    const bottleneck = formattedStats.reduce((max, stat) => 
      stat.count > max.count ? stat : max, 
      formattedStats[0] || { station: '', station_name: '', count: 0, total_quantity: 0 }
    )

    // Her istasyon için üretim emri bazlı detayları al
    const stationDetails: Record<string, Array<{ order_number: string; count: number; product_name: string }>> = {}
    
    for (const station of stationOrder) {
      let details: Array<{ order_number: string; count: number; product_name: string }>
      
      if (station === 'pending') {
        details = []
      } else if (station === 'completed') {
        // Mamül Depo için özel sorgu - Sevk edilmiş ürünleri hariç tut
        details = db.prepare(`
          SELECT 
            po.order_number,
            COUNT(psn.id) as count,
            p.name as product_name
          FROM product_serial_numbers psn
          JOIN production_orders po ON psn.production_order_id = po.id
          JOIN active_products p ON po.product_id = p.id
          WHERE (psn.current_station = 'completed' OR psn.current_station IS NULL)
            AND psn.status IN ('available', 'in_stock')
            AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
          GROUP BY po.order_number, p.name
          ORDER BY po.order_number
        `).all() as Array<{ order_number: string; count: number; product_name: string }>
      } else if (station === 'sevkiyat') {
        // Sevkiyat için özel sorgu - Sevk edilmiş ürünler
        details = db.prepare(`
          SELECT 
            po.order_number,
            COUNT(psn.id) as count,
            p.name as product_name
          FROM product_serial_numbers psn
          JOIN production_orders po ON psn.production_order_id = po.id
          JOIN active_products p ON po.product_id = p.id
          WHERE psn.shipment_id IS NOT NULL
            AND psn.shipment_id != ''
          GROUP BY po.order_number, p.name
          ORDER BY po.order_number
        `).all() as Array<{ order_number: string; count: number; product_name: string }>
      } else {
        // Diğer istasyonlar için normal sorgu
        details = db.prepare(`
          SELECT 
            po.order_number,
            COUNT(psn.id) as count,
            p.name as product_name
          FROM product_serial_numbers psn
          JOIN production_orders po ON psn.production_order_id = po.id
          JOIN active_products p ON po.product_id = p.id
          WHERE po.status != 'completed' 
            AND po.status != 'cancelled'
            AND COALESCE(psn.current_station, po.current_station) = ?
          GROUP BY po.order_number, p.name
          ORDER BY po.order_number
        `).all(station) as Array<{ order_number: string; count: number; product_name: string }>
      }
      
      stationDetails[station] = details
    }

    // formattedStats'a detayları ekle
    const statsWithDetails = formattedStats.map(stat => ({
      ...stat,
      details: stationDetails[stat.station] || []
    }))

    return NextResponse.json({
      stations: statsWithDetails,
      bottleneck: bottleneck.count > 0 ? bottleneck : null,
      total_pending: formattedStats.reduce((sum, s) => sum + s.count, 0)
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


