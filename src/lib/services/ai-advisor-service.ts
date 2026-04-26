import { getDatabase } from '@/lib/database/db';

/**
 * AI Advisor Service
 * Veritabanındaki trendleri ve anomalileri analiz eder.
 */
export const aiAdvisorService = {
  
  /**
   * Haftalık Finansal Özet Al
   */
  async getWeeklyFinancialSummary(companyId: string) {
    const db = getDatabase();
    
    // Son 7 günün gelir/gideri
    const last7Days = db.prepare(`
      SELECT 
        SUM(total_debit) as income,
        SUM(total_credit) as expense
      FROM journal_entries 
      WHERE company_id = ? 
        AND entry_date >= date('now', '-7 days')
        AND deleted_at IS NULL
    `).get(companyId) as { income: number; expense: number };

    // Bir önceki 7 günün gelir/gideri (Kıyaslama için)
    const prev7Days = db.prepare(`
      SELECT 
        SUM(total_debit) as income,
        SUM(total_credit) as expense
      FROM journal_entries 
      WHERE company_id = ? 
        AND entry_date >= date('now', '-14 days')
        AND entry_date < date('now', '-7 days')
        AND deleted_at IS NULL
    `).get(companyId) as { income: number; expense: number };

    const incomeTrend = prev7Days.income > 0 ? ((last7Days.income - prev7Days.income) / prev7Days.income) * 100 : 0;
    const expenseTrend = prev7Days.expense > 0 ? ((last7Days.expense - prev7Days.expense) / prev7Days.expense) * 100 : 0;

    return {
      income: last7Days.income || 0,
      expense: last7Days.expense || 0,
      incomeTrend,
      expenseTrend,
      netProfit: (last7Days.income || 0) - (last7Days.expense || 0)
    };
  },

  /**
   * Kritik Stok ve Hareketlilik Analizi
   */
  async getStockInsights(companyId: string) {
    const db = getDatabase();
    
    // Kritik seviyenin altındaki ürünler
    const criticalStocks = db.prepare(`
      SELECT name, stock_amount, min_stock_level
      FROM products
      WHERE company_id = ? AND stock_amount <= min_stock_level AND deleted_at IS NULL
      LIMIT 3
    `).all(companyId) as any[];

    // En çok satan 3 ürün (Son 30 gün)
    const topSellers = db.prepare(`
      SELECT product_name as name, SUM(quantity) as total_sold
      FROM orders
      WHERE company_id = ? AND order_date >= date('now', '-30 days') AND deleted_at IS NULL
      GROUP BY product_id
      ORDER BY total_sold DESC
      LIMIT 3
    `).all(companyId) as any[];

    return {
      criticalCount: criticalStocks.length,
      criticalSamples: criticalStocks,
      topSellers
    };
  },

  /**
   * Üretim Verimlilik Analizi
   */
  async getProductionStatus(companyId: string) {
    const db = getDatabase();
    
    const status = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active
      FROM production_orders
      WHERE company_id = ? AND deleted_at IS NULL
    `).get(companyId) as { total: number; delayed: number; active: number };

    const delayRate = status.total > 0 ? (status.delayed / status.total) * 100 : 0;

    return {
      ...status,
      delayRate
    };
  },

  /**
   * Üretim Planlama ve Kapasite Analizi (Kategori 3)
   */
  async getProductionPlanningInsights(companyId: string) {
    const db = getDatabase();
    
    // İstasyon kapasitelerini ve mevcut doluluğu al
    const stations = db.prepare(`
      SELECT 
        wc.id, 
        wc.name, 
        wc.capacity,
        COUNT(po.id) as current_orders
      FROM work_centers wc
      LEFT JOIN production_orders po ON wc.name = po.current_station 
        AND po.company_id = wc.company_id 
        AND po.status NOT IN ('completed', 'cancelled')
      WHERE wc.company_id = ? AND wc.deleted_at IS NULL
      GROUP BY wc.id
    `).all(companyId) as any[];

    const analysis = stations.map(s => {
      const usage = s.capacity > 0 ? (s.current_orders / s.capacity) * 100 : 0;
      return {
        ...s,
        usage: Math.round(usage),
        status: usage > 90 ? 'critical' : usage > 70 ? 'warning' : 'optimal'
      };
    });

    const bottleneck = analysis.reduce((max, s) => s.usage > max.usage ? s : max, analysis[0] || { usage: 0 });

    return {
      stations: analysis,
      bottleneck: bottleneck.usage > 0 ? bottleneck : null
    };
  },

  /**
   * Genel "Advisor" Tavsiyesi Oluştur
   */
  async generateDailyInsights(companyId: string) {
    const finance = await this.getWeeklyFinancialSummary(companyId);
    const stock = await this.getStockInsights(companyId);
    const production = await this.getProductionStatus(companyId);
    const planning = await this.getProductionPlanningInsights(companyId);

    const insights: string[] = [];

    if (finance.incomeTrend > 10) {
      insights.push("Satışlarınızda bu hafta %10'dan fazla artış var, büyüme trendi devam ediyor! 🚀");
    }
    
    if (stock.criticalCount > 0) {
      insights.push(`${stock.criticalCount} ürün kritik stok seviyesinin altında. Tedarik planlaması yapmanızı öneririm. ⚠️`);
    }

    if (production.delayed > 0) {
      insights.push(`${production.delayed} üretim emri gecikmede görünüyor. Kapasite planlamasını gözden geçirebilirsiniz. 🏭`);
    }

    if (planning.bottleneck && planning.bottleneck.usage > 90) {
      insights.push(`Dikkat! ${planning.bottleneck.name} istasyonu %${planning.bottleneck.usage} doluluğa ulaştı. Yeni üretimleri bu istasyondan önce duraklatabilirsiniz. 🛑`);
    }

    if (insights.length === 0) {
      insights.push("Sistem verileri stabil görünüyor. Her şey yolunda! ✅");
    }

    return insights;
  }
};
