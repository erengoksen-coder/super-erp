import { getDatabase } from '@/lib/database/db';

export interface materialRequirement {
  material_id: string;
  material_name: string;
  material_code: string;
  unit: string;
  total_needed: number;
  current_stock: number;
  shortage: number;
  blocked_orders: Array<{ order_number: string; quantity: number }>;
}

export const mrpService = {
  /**
   * Tüm kesinleşmiş siparişler ve üretim emirleri için hammadde ihtiyaçlarını hesaplar.
   */
  async calculateRequirements(companyId: string) {
    const db = getDatabase();

    // 1. Kesinleşmiş ancak tamamlanmamış üretim emirlerini ve siparişleri al
    // Siparişler henüz üretime dönüşmemiş olanlar (veya kısmi dönüşenler)
    // Üretim emirleri ise halihazırda üretimde olanlar.
    
    // Not: Gerçek bir ERP'de sipariş -> üretim emri dönüşümü tam takip edilir. 
    // Burada basitleştirme adına: 
    // - production_orders (status != 'completed' AND status != 'cancelled')
    // - orders (status = 'pending') -- Bunlar henüz PO olmamış kabul edilir.
    
    const productionOrders = db.prepare(`
      SELECT id, order_number, product_id, quantity 
      FROM production_orders 
      WHERE company_id = ? AND status NOT IN ('completed', 'cancelled') AND deleted_at IS NULL
    `).all(companyId) as any[];

    const pendingOrders = db.prepare(`
      SELECT id, order_number, product_id, quantity 
      FROM orders 
      WHERE company_id = ? AND status = 'pending' AND (production_order_id IS NULL OR production_order_id = '') AND deleted_at IS NULL
    `).all(companyId) as any[];

    const allRequirements = new Map<string, materialRequirement>();

    const processOrder = (order: any) => {
      // Ürünün AKTİF BOM versiyonunu bul
      const activeBomItems = db.prepare(`
        SELECT b.material_id, b.quantity_required, m.name, m.code, m.unit, m.stock_amount
        FROM bom b
        JOIN materials m ON b.material_id = m.id
        JOIN bom_versions bv ON b.version_id = bv.id
        WHERE b.product_id = ? AND bv.is_active = 1 AND b.deleted_at IS NULL
      `).all(order.product_id) as any[];

      activeBomItems.forEach(item => {
        const needed = item.quantity_required * order.quantity;
        const existing = allRequirements.get(item.material_id);

        if (existing) {
          existing.total_needed += needed;
          existing.blocked_orders.push({ order_number: order.order_number, quantity: order.quantity });
        } else {
          allRequirements.set(item.material_id, {
            material_id: item.material_id,
            material_name: item.name,
            material_code: item.code,
            unit: item.unit || 'Adet',
            total_needed: needed,
            current_stock: item.stock_amount || 0,
            shortage: 0, // Sonradan hesaplanacak
            blocked_orders: [{ order_number: order.order_number, quantity: order.quantity }]
          });
        }
      });
    };

    productionOrders.forEach(processOrder);
    pendingOrders.forEach(processOrder);

    // Eksikleri hesapla
    const result: materialRequirement[] = [];
    allRequirements.forEach(req => {
      req.shortage = Math.max(0, req.total_needed - req.current_stock);
      result.push(req);
    });

    return result;
  },

  /**
   * Belirli bir malzeme için hangi siparişlerin beklediğini döner.
   */
  async getMaterialImpact(companyId: string, materialId: string) {
    const requirements = await this.calculateRequirements(companyId);
    return requirements.find(r => r.material_id === materialId);
  }
};
