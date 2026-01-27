import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

export async function GET() {
  try {
    const db = getDatabase()

    // 1. Toplam Stok Değeri (Hammaddeler)
    const materials = db.prepare('SELECT stock_amount, min_stock_level FROM materials').all() as any[]
    const totalStockValue = materials.reduce((sum, m) => sum + (m.stock_amount || 0), 0)

    // 2. Bekleyen Üretimler
    const pendingProduction = db.prepare(`
      SELECT COUNT(*) as count 
      FROM production_orders 
      WHERE status IN ('pending', 'in_progress')
    `).get() as any

    // 3. Kritik Stok Uyarıları
    const criticalStock = db.prepare(`
      SELECT COUNT(*) as count 
      FROM materials 
      WHERE stock_amount < min_stock_level
    `).get() as any

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
    `).all(dateStr) as any[]

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
    `).all() as any[]

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
      const stat = stationStats.find((s: any) => s.current_station === station)
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

    return NextResponse.json({
      totalStockValue,
      pendingProduction: pendingProduction?.count || 0,
      criticalStock: criticalStock?.count || 0,
      productionTrend: trendData,
      stationStats: formattedStationStats,
      bottleneck: bottleneck.count > 0 ? bottleneck : null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

