import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db';
import { randomUUID } from 'crypto';
import { AuditService } from '@/lib/services/audit';

/**
 * Agi-Engine Agentic Service
 * Automatically connects Orders -> BOM -> Inventory -> Procurement
 */
export const AgenticService = {
  /**
   * Scans an order and generates purchase requests for missing materials
   * This is the "Automated procurement" logic mentioned in the roadmap.
   */
  async processOrderMaterials(orderId: string, companyId: string, branchId: string) {
    const db = getDatabase();
    
    // 1. Get Order Items
    const orderItems = db.prepare(`
        SELECT product_id, quantity 
        FROM order_items 
        WHERE order_id = ?
    `).all(orderId) as Array<{ product_id: string; quantity: number }>;

    for (const item of orderItems) {
      // 2. Lookup BOM (Recipe) for each product
      const recipeItems = db.prepare(`
        SELECT material_id, quantity as req_qty
        FROM product_recipe_items
        WHERE product_id = ?
      `).all(item.product_id) as Array<{ material_id: string; req_qty: number }>;

      for (const rx of recipeItems) {
        const totalNeeded = rx.req_qty * item.quantity;

        // 3. Check Current Stock
        const stock = db.prepare(`
            SELECT id, stock_amount, name 
            FROM materials 
            WHERE id = ? AND company_id = ? AND branch_id = ?
        `).get(rx.material_id, companyId, branchId) as { id: string; stock_amount: number; name: string } | undefined;

        if (stock) {
          const currentStock = stock.stock_amount || 0;
          
          if (currentStock < totalNeeded) {
            const deficit = totalNeeded - currentStock;

            // 4. Create Automated Purchase Request
            db.prepare(`
                INSERT INTO purchase_requests 
                (id, material_id, quantity, status, description, company_id, branch_id)
                VALUES (?, ?, ?, 'pending', ?, ?, ?)
            `).run(
              randomUUID(),
              stock.id,
              deficit,
              `Agi-Agent: Otomatik sipariş - "${stock.name}" eksikliği gideriliyor (Sipariş: ${orderId})`,
              companyId,
              branchId
            );
            
            // 5. Log as Agentic Action in Audit
            await AuditService.log({
              companyId,
              branchId,
              actionType: 'CREATE',
              entityName: 'purchase_requests',
              entityId: stock.id,
              description: `Agi-Agent: "${stock.name}" için otomatik satın alma talebi oluşturuldu. (Eksik: ${deficit})`
            });
            
            console.log(`[Agi-Agent] Auto-Purchase Created: ${stock.name} Qty: ${deficit}`);
          }
        }
      }
    }
  }
};
