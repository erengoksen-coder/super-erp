import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'

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

export async function GET() {
  return handleApi(async () => {
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
      const found = productionTrend.find(p => p.date === dateKey)
      trendData.push({
        date: dateKey,
        count: found?.count || 0,
        total_quantity: found?.total_quantity || 0,
      })
    }

    // İstasyon istatistiklerini al
    const stationStats = db.prepare(`
      SELECT 
        current_station,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM production_orders
      WHERE status != 'completed' AND status != 'cancelled'
      GROUP BY current_station
    `).all() as StationStatRow[]

    const stationOrder = ['iskelet', 'terzihane', 'berjer', 'döseme', 'montaj', 'sevkiyat']
    const stationNames: Record<string, string> = {
      iskelet: 'İskelet',
      terzihane: 'Terzihane',
      berjer: 'Berjer',
      döseme: 'Döşeme',
      montaj: 'Montaj',
      sevkiyat: 'Sevkiyat',
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

    return ok(
      {
        totalStockValue,
        pendingProduction: pendingProduction?.count || 0,
        criticalStock: criticalStock?.count || 0,
        productionTrend: trendData,
        stationStats: formattedStationStats,
        bottleneck: bottleneck.count > 0 ? bottleneck : null,
      },
      { headers: CACHE_HEADERS_SHORT }
    )
  })
}

