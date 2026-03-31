import { getDatabase } from '@/lib/database/db';

export const analyticsService = {
  /**
   * Belirli bir ay için ciro detaylarını (sevkiyatları) getirir.
   */
  async getMonthlyRevenueDetails(companyId: string, yearMonth: string) {
    const db = getDatabase();
    
    // yearMonth formatı: 'YYYY-MM'
    // shipments tablosundan o aya ait sevkiyatları çekiyoruz
    const rows = db.prepare(`
      SELECT 
        s.id,
        s.shipment_number,
        a.name as customer_name,
        s.shipment_date,
        s.final_amount as amount,
        s.status
      FROM shipments s
      LEFT JOIN accounts a ON s.customer_id = a.id
      WHERE s.company_id = ? 
        AND strftime('%Y-%m', s.shipment_date) = ?
        AND s.deleted_at IS NULL
      ORDER BY s.shipment_date DESC
    `).all(companyId, yearMonth) as any[];
    
    return rows;
  },

  /**
   * Yaşlandırma bucket'ı için detaylı müşteri listesini getirir.
   */
  async getAgingDetails(companyId: string, bucket: string) {
    const db = getDatabase();
    
    let dateFilter = '';
    switch (bucket) {
      case 'current':
        dateFilter = "julianday('now') - julianday(created_at) <= 30";
        break;
      case 'thirtyDay':
        dateFilter = "julianday('now') - julianday(created_at) > 30 AND julianday('now') - julianday(created_at) <= 60";
        break;
      case 'sixtyDay':
        dateFilter = "julianday('now') - julianday(created_at) > 60 AND julianday('now') - julianday(created_at) <= 90";
        break;
      case 'ninetyPlus':
        dateFilter = "julianday('now') - julianday(created_at) > 90";
        break;
    }

    const rows = db.prepare(`
      SELECT 
        a.id,
        a.name as account_name,
        SUM(CASE WHEN t.transaction_type = 'debit' THEN CAST(t.amount AS REAL) ELSE -CAST(t.amount AS REAL) END) as overdue_amount,
        COUNT(t.id) as transaction_count
      FROM account_transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE t.company_id = ? 
        AND t.deleted_at IS NULL
        AND ${dateFilter}
      GROUP BY a.id
      HAVING overdue_amount > 0
      ORDER BY overdue_amount DESC
    `).all(companyId) as any[];

    return rows;
  }
};
