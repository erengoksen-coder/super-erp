import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { getOrSetCache } from '@/lib/cache/memory'

type MaterialStockRow = {
  stock_amount: number | null
  min_stock_level: number | null
  unit_price: number | null
}

type CountRow = {
  count: number | null
}

type ProductionTrendRow = {
  date: string
  count: number | null
  total_quantity: number | null
}

type StationStatRow = {
  current_station: string
  count: number | null
  total_quantity: number | null
}

export const GET = withAuth(async (request) => {
  return handleApi(async () => {
    const data = await getOrSetCache('dashboard:stats', 15_000, async () => {
      const db = getDatabase()

      // 1. Toplam Stok Değeri (Hammaddeler: miktar * birim fiyat)
      const materials = db
        .prepare('SELECT stock_amount, min_stock_level, COALESCE(unit_price, 0) as unit_price FROM materials WHERE deleted_at IS NULL')
        .all() as MaterialStockRow[]
      const totalStockValue = materials.reduce((sum, m) => sum + (m.stock_amount || 0) * (m.unit_price ?? 0), 0)

      // 2. Bekleyen Üretimler
      const pendingProduction = db.prepare(`
        SELECT COUNT(*) as count 
        FROM production_orders 
        WHERE status IN ('pending', 'in_progress')
      `).get() as CountRow | undefined

      // 3. Kritik Stok Uyarıları (min seviye tanımlı ve stok onun altında)
      const criticalStock = db.prepare(`
        SELECT COUNT(*) as count 
        FROM materials 
        WHERE deleted_at IS NULL AND min_stock_level IS NOT NULL AND (stock_amount IS NULL OR stock_amount < min_stock_level)
      `).get() as CountRow | undefined

      // 4. Son 7 günlük üretim trendi
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dateStr = sevenDaysAgo.toISOString().split('T')[0]

      const productionTrend = db.prepare(`
        SELECT 
          date(created_at) as date,
          COUNT(*) as count,
          SUM(quantity) as total_quantity
        FROM production_orders
        WHERE date(created_at) >= date(?)
        GROUP BY date(created_at)
        ORDER BY date(created_at) ASC
      `).all(dateStr) as ProductionTrendRow[]

      // Eksik günleri doldur
      const trendData = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        const found = productionTrend.find((p) => p.date === dateKey)
        trendData.push({
          date: dateKey,
          count: found?.count || 0,
          total_quantity: found?.total_quantity || 0,
        })
      }

      // Bekleyen: barkod listesi ile aynı kapsam - üretim emri atanmış pending (product_serial_numbers)
      const pendingStats = db.prepare(`
        SELECT COUNT(id) as count FROM product_serial_numbers
        WHERE status = 'pending'
          AND production_order_id IS NOT NULL AND production_order_id != ''
      `).get() as { count: number }
      const pendingCount = Number((pendingStats as any).count ?? 0)

      // Aktif istasyonlar için kart bazlı sayım
      const activeStats = db.prepare(`
        SELECT 
          COALESCE(psn.current_station, po.current_station) as current_station,
          COUNT(psn.id) as count,
          COUNT(psn.id) as total_quantity
        FROM product_serial_numbers psn
        JOIN production_orders po ON psn.production_order_id = po.id
        WHERE po.status != 'completed' 
          AND po.status != 'cancelled'
          AND COALESCE(psn.current_station, po.current_station) IS NOT NULL
        GROUP BY COALESCE(psn.current_station, po.current_station)
      `).all() as StationStatRow[]
      
      // Mamül Depo: depoda ve sevk edilmemiş tüm mamüller (barkod yönetimi ile aynı)
      const completedStats = db.prepare(`
        SELECT COUNT(id) as count FROM product_serial_numbers psn
        WHERE psn.status IN ('available', 'in_stock')
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
      `).get() as { count: number | null }
      const completedCount = Number(completedStats?.count ?? 0)
      
      const shippedStats = db.prepare(`
        SELECT COUNT(id) as count FROM product_serial_numbers psn
        WHERE psn.shipment_id IS NOT NULL AND psn.shipment_id != ''
      `).get() as { count: number | null }
      const shippedCount = Number(shippedStats?.count ?? 0)
      
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
      const formattedStationStats = stationOrder.map(station => {
        let count = 0
        let total_quantity = 0
        if (station === 'pending') {
          count = total_quantity = pendingCount
        } else if (station === 'completed') {
          count = total_quantity = completedCount
        } else if (station === 'sevkiyat') {
          count = total_quantity = shippedCount
        } else {
          const stat = activeStats.find((s) => s.current_station === station)
          count = stat?.count ?? 0
          total_quantity = stat?.total_quantity ?? 0
        }
        return {
          station,
          station_name: stationNames[station] || station,
          count,
          total_quantity
        }
      })

      // Darboğaz (en çok biriken istasyon)
      const bottleneck = formattedStationStats.reduce((max, stat) => 
        stat.count > max.count ? stat : max, 
        formattedStationStats[0] || { station: '', station_name: '', count: 0, total_quantity: 0 }
      )

      return {
        totalStockValue,
        pendingProduction: pendingProduction?.count || 0,
        criticalStock: criticalStock?.count || 0,
        productionTrend: trendData,
        stationStats: formattedStationStats,
        bottleneck: bottleneck.count > 0 ? bottleneck : null,
      }
    })

    return ok(data, { headers: CACHE_HEADERS_SHORT })
  })
})

