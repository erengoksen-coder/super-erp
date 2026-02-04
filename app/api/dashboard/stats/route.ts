import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { getOrSetCache } from '@/lib/cache/memory'

type MaterialStockRow = {
  stock_amount: number | null
  min_stock_level: number | null
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

      // 1. Toplam Stok Değeri (Hammaddeler)
      const materials = db
        .prepare('SELECT stock_amount, min_stock_level FROM materials')
        .all() as MaterialStockRow[]
      const totalStockValue = materials.reduce((sum, m) => sum + (m.stock_amount || 0), 0)

      // 2. Bekleyen Üretimler
      const pendingProduction = db.prepare(`
        SELECT COUNT(*) as count 
        FROM production_orders 
        WHERE status IN ('pending', 'in_progress')
      `).get() as CountRow | undefined

      // 3. Kritik Stok Uyarıları
      const criticalStock = db.prepare(`
        SELECT COUNT(*) as count 
        FROM materials 
        WHERE stock_amount < min_stock_level
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
      
      // Mamül Depo (completed) için sayım - Sevk edilmiş ürünleri hariç tut
      const completedStats = db.prepare(`
        SELECT 
          COUNT(psn.id) as count,
          COUNT(psn.id) as total_quantity
        FROM product_serial_numbers psn
        JOIN production_orders po ON psn.production_order_id = po.id
        WHERE (psn.current_station = 'completed' OR psn.current_station IS NULL)
          AND psn.status IN ('available', 'in_stock')
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
      `).get() as { count: number | null; total_quantity: number | null } | undefined
      
      // Sevkiyat (shipped) için sayım - Sevk edilmiş ürünler
      const shippedStats = db.prepare(`
        SELECT 
          COUNT(psn.id) as count,
          COUNT(psn.id) as total_quantity
        FROM product_serial_numbers psn
        WHERE psn.shipment_id IS NOT NULL
          AND psn.shipment_id != ''
      `).get() as { count: number | null; total_quantity: number | null } | undefined
      
      // Aktif istasyonları birleştir
      const stationStats = [...activeStats]
      
      // Sevkiyat istatistiklerini ekle
      if (shippedStats && (shippedStats.count || 0) > 0) {
        stationStats.push({
          current_station: 'sevkiyat',
          count: shippedStats.count || 0,
          total_quantity: shippedStats.total_quantity || 0
        })
      }
      
      // Mamül Depo istatistiklerini ekle
      if (completedStats && (completedStats.count || 0) > 0) {
        stationStats.push({
          current_station: 'completed',
          count: completedStats.count || 0,
          total_quantity: completedStats.total_quantity || 0
        })
      }

      const stationOrder = ['iskelet', 'terzihane', 'berjer', 'döseme', 'montaj', 'sevkiyat', 'completed']
      const stationNames: Record<string, string> = {
        iskelet: 'İskelet',
        terzihane: 'Terzihane',
        berjer: 'Berjer',
        döseme: 'Döşeme',
        montaj: 'Montaj',
        sevkiyat: 'Sevkiyat',
        completed: 'Mamül Depo',
      }
      const formattedStationStats = stationOrder.map(station => {
        const stat = stationStats.find((s) => s.current_station === station)
        return {
          station,
          station_name: stationNames[station] || station,
          count: stat?.count || 0,
          total_quantity: stat?.total_quantity || 0
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

