import { getDatabase } from '@/lib/database/db'

export type ProductionCostSummary = {
  total_material_cost: number
  total_labor_cost: number
  total_cost: number
  avg_cost_per_unit: number
  order_count: number
}

export type StationEfficiency = {
  station_code: string
  station_name: string
  avg_duration_minutes: number
  total_orders_processed: number
}

export class ProductionReportingService {
  private db = getDatabase()

  /**
   * Belirli bir tarih aralığındaki üretim maliyetlerini özetler
   */
  getCostSummary(startDate: string, endDate: string): ProductionCostSummary {
    const row = this.db.prepare(`
      SELECT 
        SUM(material_cost) as total_material_cost,
        SUM(labor_cost) as total_labor_cost,
        SUM(total_cost) as total_cost,
        AVG(total_cost / quantity) as avg_cost_per_unit,
        COUNT(*) as order_count
      FROM production_orders
      WHERE completed_at BETWEEN ? AND ?
      AND status = 'completed'
    `).get(startDate, endDate) as any

    return {
      total_material_cost: row?.total_material_cost || 0,
      total_labor_cost: row?.total_labor_cost || 0,
      total_cost: row?.total_cost || 0,
      avg_cost_per_unit: row?.avg_cost_per_unit || 0,
      order_count: row?.order_count || 0
    }
  }

  /**
   * Sevkiyat Hazırlık Analizi
   * Sevkiyat istasyonundaki (hazır) emirler
   */
  getShipmentReadiness() {
    return this.db.prepare(`
            SELECT 
                po.id,
                po.order_number,
                p.name as product_name,
                po.quantity,
                c.name as customer_name
            FROM production_orders po
            JOIN products p ON po.product_id = p.id
            LEFT JOIN sales_order_items soi ON po.id = soi.production_order_id
            LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
            LEFT JOIN accounts c ON so.customer_id = c.id
            WHERE po.current_station = 'Sevkiyat' AND po.status != 'completed'
            ORDER BY po.created_at DESC
        `).all()
  }

  getRecentShipments() {
    return this.db.prepare(`
            SELECT 
                s.id,
                s.shipment_number,
                s.shipment_date,
                s.status,
                c.name as customer_name,
                (SELECT COUNT(*) FROM shipment_items si WHERE si.shipment_id = s.id) as item_count,
                (SELECT id FROM waybills w WHERE w.shipment_id = s.id LIMIT 1) as waybill_id
            FROM shipments s
            LEFT JOIN accounts c ON s.customer_id = c.id
            WHERE s.deleted_at IS NULL
            ORDER BY s.created_at DESC
            LIMIT 10
        `).all()
  }

  /**
   * İstasyon bazlı verimlilik analizi
   */
  getStationEfficiency(): StationEfficiency[] {
    return this.db.prepare(`
      SELECT 
        wc.code as station_code,
        wc.name as station_name,
        AVG(pot.duration_minutes) as avg_duration_minutes,
        COUNT(pot.id) as total_orders_processed
      FROM work_centers wc
      LEFT JOIN production_order_times pot ON wc.id = pot.work_center_id
      WHERE pot.duration_minutes IS NOT NULL
      GROUP BY wc.id
      ORDER BY avg_duration_minutes ASC
    `).all() as StationEfficiency[]
  }

  /**
   * Üretim Gecikme Analizi (Planlanan vs Gerçekleşen)
   */
  getDelayAnalysis() {
    return this.db.prepare(`
      SELECT 
        order_number,
        due_date,
        completed_at,
        julianday(completed_at) - julianday(due_date) as delay_days
      FROM production_orders
      WHERE status = 'completed' AND completed_at > due_date
      ORDER BY delay_days DESC
      LIMIT 10
    `).all()
  }

  /**
   * Ürün Bazlı Kar Zarar Tahmini (Üretim Maliyeti vs Satış Fiyatı)
   */
  getProductProfitability() {
    return this.db.prepare(`
      SELECT 
        p.name,
        p.sku,
        AVG(po.total_cost / po.quantity) as avg_production_cost,
        AVG(o.unit_price) as avg_sales_price,
        AVG(o.unit_price - (po.total_cost / po.quantity)) as avg_profit,
        COUNT(po.id) as total_produced
      FROM products p
      JOIN production_orders po ON p.id = po.product_id
      JOIN sales_order_items o ON o.production_order_id = po.id
      WHERE po.status = 'completed'
      GROUP BY p.id
      ORDER BY avg_profit DESC
    `).all()
  }

  /**
   * Malzeme Fire/Zayiat Analizi
   */
  getScrapAnalysis() {
    return this.db.prepare(`
            SELECT 
                m.name as material_name,
                m.unit,
                SUM(pac.fire_quantity) as total_fire,
                AVG(pac.variance_percentage) as avg_variance_pct,
                COUNT(pac.id) as record_count
            FROM production_actual_consumption pac
            JOIN materials m ON pac.material_id = m.id
            WHERE pac.fire_quantity > 0
            GROUP BY m.id
            ORDER BY total_fire DESC
            LIMIT 10
        `).all()
  }

  /**
   * Aylık Üretim Hacmi ve Maliyet Trendi
   */
  getMonthlyTrends() {
    return this.db.prepare(`
            SELECT 
                strftime('%Y-%m', completed_at) as month,
                COUNT(*) as order_count,
                SUM(total_cost) as total_cost,
                SUM(quantity) as total_quantity
            FROM production_orders
            WHERE status = 'completed' AND completed_at IS NOT NULL
            GROUP BY month
            ORDER BY month ASC
            LIMIT 12
        `).all()
  }

  /**
   * En Çok Tüketilen Malzemeler (Maliyet Bazlı)
   */
  getMaterialUsageTrend() {
    return this.db.prepare(`
            SELECT 
                m.name,
                SUM(pac.actual_quantity) as total_qty,
                m.unit,
                SUM(pac.actual_quantity * COALESCE(m.unit_price, 0)) as total_cost
            FROM production_actual_consumption pac
            JOIN materials m ON pac.material_id = m.id
            GROUP BY m.id
            ORDER BY total_cost DESC
            LIMIT 5
        `).all()
  }

  /**
   * Operatör Performansı (Kullanıcı bazlı)
   */
  getOperatorPerformance() {
    return this.db.prepare(`
            SELECT 
                u.full_name as operator_name,
                COUNT(pot.id) as task_count,
                AVG(pot.duration_minutes) as avg_duration_minutes,
                u.position
            FROM production_order_times pot
            JOIN users u ON pot.operator_id = u.id
            WHERE pot.end_at IS NOT NULL
            GROUP BY u.id
            ORDER BY task_count DESC
            LIMIT 5
        `).all()
  }

  /**
   * Üretim Tahmini (Gelecek 7 gün için bekleyen iş yükü)
   */
  getProductionForecast() {
    return this.db.prepare(`
            SELECT 
                po.id,
                po.order_number,
                p.name as product_name,
                po.quantity,
                po.current_station,
                (
                    SELECT AVG(julianday(completed_at) - julianday(created_at)) 
                    FROM production_orders 
                    WHERE product_id = po.product_id AND status = 'completed'
                ) as avg_completion_days
            FROM production_orders po
            JOIN products p ON po.product_id = p.id
            WHERE po.status != 'completed' AND po.status != 'cancelled'
            ORDER BY po.due_date ASC
            LIMIT 10
        `).all()
  }

  /**
   * Hammadde Gereksinim (MRP) Analizi
   * Aktif tüm üretim emirleri için gereken toplam malzeme vs Mevcut Stok
   */
  getMaterialRequirements() {
    return this.db.prepare(`
            SELECT 
                m.id,
                m.name as material_name,
                m.unit,
                SUM(po.quantity * b.quantity_required * (1 + COALESCE(b.fire_percentage, 0) / 100)) as total_required,
                COALESCE(m.stock_amount, 0) as current_stock,
                (SUM(po.quantity * b.quantity_required * (1 + COALESCE(b.fire_percentage, 0) / 100)) - COALESCE(m.stock_amount, 0)) as shortage
            FROM production_orders po
            JOIN bom b ON po.product_id = b.product_id
            JOIN materials m ON b.material_id = m.id
            WHERE po.status NOT IN ('completed', 'cancelled')
            GROUP BY m.id, m.name, m.unit
            HAVING total_required > current_stock
            ORDER BY shortage DESC
        `).all()
  }
}

export const productionReportingService = new ProductionReportingService()
