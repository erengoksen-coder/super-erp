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
      
      // Mamül Depo: sadece depoda ve henüz sevk edilmemiş mamüller (sevk edilenler hariç)
      const completedStats = db.prepare(`
        SELECT COUNT(id) as count FROM product_serial_numbers psn
        WHERE (psn.status IN ('available', 'in_stock') OR (psn.status IS NULL AND (COALESCE(psn.shipment_id, '') = '')))
          AND (COALESCE(psn.shipment_id, '') = '')
          AND (psn.status IS NULL OR psn.status != 'shipped')
      `).get() as { count: number | null }
      const completedCount = Number(completedStats?.count ?? 0)
      
      const shippedStats = db.prepare(`
        SELECT COUNT(id) as count FROM product_serial_numbers psn
        WHERE psn.shipment_id IS NOT NULL AND psn.shipment_id != ''
      `).get() as { count: number | null }
      const shippedCount = Number(shippedStats?.count ?? 0)

      // Bu ay ciro: sevkiyatların final_amount toplamı (bu ay teslim/sevk edilen)
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const salesThisMonthRow = db.prepare(`
        SELECT COALESCE(SUM(CAST(final_amount AS REAL)), 0) as total
        FROM shipments
        WHERE (deleted_at IS NULL OR deleted_at = '')
          AND (shipment_date >= ? OR created_at >= ?)
      `).get(monthStart, monthStart) as { total: number }
      const salesThisMonth = Number(salesThisMonthRow?.total ?? 0)

      // Önceki ay ciro (karşılaştırma için)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthStartStr = prevMonthStart.toISOString().split('T')[0]
      const prevMonthEndStr = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      const salesLastMonthRow = db.prepare(`
        SELECT COALESCE(SUM(CAST(final_amount AS REAL)), 0) as total
        FROM shipments
        WHERE (deleted_at IS NULL OR deleted_at = '')
          AND (shipment_date >= ? AND shipment_date <= ?)
      `).get(prevMonthStartStr, prevMonthEndStr) as { total: number }
      const salesLastMonth = Number(salesLastMonthRow?.total ?? 0)

      // Bekleyen tahsilat: carilerdeki toplam alacak (balance > 0)
      const receivablesRow = db.prepare(`
        SELECT COALESCE(SUM(CAST(balance AS REAL)), 0) as total
        FROM accounts
        WHERE (deleted_at IS NULL OR deleted_at = '') AND CAST(balance AS REAL) > 0
      `).get() as { total: number }
      const totalReceivables = Number(receivablesRow?.total ?? 0)

      // Bugünkü işlemler (bugün oluşturulan kayıt sayıları)
      const todayStr = now.toISOString().split('T')[0]
      const todayOrdersRow = db.prepare(`
        SELECT COUNT(*) as count FROM orders WHERE deleted_at IS NULL AND date(created_at) = ?
      `).get(todayStr) as CountRow | undefined
      const todayInvoicesRow = db.prepare(`
        SELECT COUNT(*) as count FROM invoices WHERE deleted_at IS NULL AND date(created_at) = ?
      `).get(todayStr) as CountRow | undefined
      const todayShipmentsRow = db.prepare(`
        SELECT COUNT(*) as count FROM shipments WHERE deleted_at IS NULL AND date(created_at) = ?
      `).get(todayStr) as CountRow | undefined
      const todayOrders = Number(todayOrdersRow?.count ?? 0)
      const todayInvoices = Number(todayInvoicesRow?.count ?? 0)
      const todayShipments = Number(todayShipmentsRow?.count ?? 0)

      // Onay bekleyen sevkiyat sayısı (risk limiti aşan)
      const pendingApprovalRow = db.prepare(`
        SELECT COUNT(*) as count FROM shipments
        WHERE deleted_at IS NULL AND approval_status = 'pending'
      `).get() as CountRow | undefined
      const pendingApprovalCount = Number(pendingApprovalRow?.count ?? 0)

      // Bu hafta teslim (delivery_date bu hafta içinde, Pazartesi–Pazar)
      const dayOfWeek = now.getDay()
      const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() + toMonday)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const weekEndStr = weekEnd.toISOString().split('T')[0]
      const deliveriesThisWeekRow = db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE deleted_at IS NULL AND delivery_date IS NOT NULL AND delivery_date != ''
          AND date(delivery_date) >= ? AND date(delivery_date) <= ?
      `).get(weekStartStr, weekEndStr) as CountRow | undefined
      const deliveriesThisWeek = Number(deliveriesThisWeekRow?.count ?? 0)

      const overdueOrdersRow = db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE deleted_at IS NULL AND delivery_date IS NOT NULL AND delivery_date != ''
          AND date(delivery_date) < ? AND status NOT IN ('completed', 'cancelled')
      `).get(todayStr) as CountRow | undefined
      const overdueOrders = Number(overdueOrdersRow?.count ?? 0)

      const overdueChecksRow = db.prepare(`
        SELECT COUNT(*) as count FROM checks_and_notes
        WHERE deleted_at IS NULL AND due_date IS NOT NULL AND date(due_date) < date('now')
          AND status NOT IN ('collected', 'cancelled')
      `).get() as CountRow | undefined
      const overdueChecksNotes = Number(overdueChecksRow?.count ?? 0)

      // Bekleyen satın alma talepleri (completed olmayan)
      const pendingPurchaseRequestsRow = db.prepare(`
        SELECT COUNT(*) as count FROM purchase_requests
        WHERE deleted_at IS NULL AND status != 'completed'
      `).get() as CountRow | undefined
      const pendingPurchaseRequests = Number(pendingPurchaseRequestsRow?.count ?? 0)
      
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
        salesThisMonth,
        salesLastMonth,
        totalReceivables,
        todayOrders,
        todayInvoices,
        todayShipments,
        pendingApprovalCount,
        deliveriesThisWeek,
        overdueOrders,
        overdueChecksNotes,
        pendingPurchaseRequests,
      }
    })

    return ok(data, { headers: CACHE_HEADERS_SHORT })
  })
})

