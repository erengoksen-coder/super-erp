import { OrderRepository, Order } from '../repositories/orderRepository';
import { logAudit } from '../audit';
import { z } from 'zod';
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID } from '../database/db';
import { logger } from '../utils/logger';

type Db = ReturnType<typeof getDatabase>;

export const OrderItemSchema = z.object({
  product_name: z.string().min(1, 'Ürün adı zorunludur'),
  configuration: z.string().min(1, 'Konfigürasyon zorunludur'),
  fabric_code: z.string().min(1, 'Kumaş kodu zorunludur'),
  quantity: z.number().min(1, 'Miktar en az 1 olmalıdır'),
  unit_price: z.number().optional().default(0),
  order_number: z.string().optional(),
  order_date: z.string().optional(),
  customer_name: z.string().optional(),
  dealer_name: z.string().optional(),
  customer_code: z.string().optional(),
  product_id: z.string().optional(),
  product_sku: z.string().optional(),
  notes: z.string().optional(),
  case_info: z.string().optional(),
  leg_info: z.string().optional(),
  cushion_info: z.string().optional(),
  unit: z.string().optional(),
});

export const OrderCreateSchema = z.object({
  orders: z.array(OrderItemSchema).min(1, 'En az bir sipariş gereklidir'),
});

export const OrderUpdateSchema = OrderItemSchema.extend({
  id: z.string().min(1, 'Sipariş ID zorunludur'),
});

export class OrderService {
  private repository = new OrderRepository();
  private db = getDatabase();

  /** Bayi isminden otomatik cari hesap oluştur */
  private createAccountIfNotExists(dealerName: string | null): void {
    if (!dealerName || !dealerName.trim()) return;
    const trimmedName = dealerName.trim();
    
    const existing = this.db.prepare('SELECT id FROM accounts WHERE name = ? COLLATE NOCASE').get(trimmedName);
    if (existing) return;

    try {
      const lastAccount = this.db.prepare("SELECT code FROM accounts WHERE type = 'customer' ORDER BY code DESC LIMIT 1").get() as any;
      const lastNum = lastAccount ? (parseInt(lastAccount.code.replace(/[^0-9]/g, '')) || 0) : 0;
      const code = `MUS-${String(lastNum + 1).padStart(4, '0')}`;
      const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      this.db.prepare('INSERT INTO accounts (id, code, name, type) VALUES (?, ?, ?, ?)').run(id, code, trimmedName, 'customer');
    } catch (e: any) {
      logger.error(`Cari hesap oluşturulamadı (${trimmedName}):`, e);
    }
  }

  /** Kumaş kodu varsa hammaddeye ekle */
  private createMaterialIfNotExists(fabricCode: string | null): void {
    if (!fabricCode || !fabricCode.trim()) return;
    const trimmedCode = fabricCode.trim();

    const existing = this.db.prepare('SELECT id FROM materials WHERE (code = ? OR name = ? COLLATE NOCASE) AND deleted_at IS NULL').get(trimmedCode, trimmedCode);
    if (existing) return;

    try {
      const id = `mat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.db.prepare(`
        INSERT INTO materials (id, code, name, category, unit, company_id, branch_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, trimmedCode, trimmedCode, 'Kumaş', 'metre', DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID);

      this.db.prepare(`
        INSERT OR IGNORE INTO material_stocks (id, material_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
      `).run(`mstock-${id}`, id, DEFAULT_WAREHOUSE_ID, 0);
    } catch (e: any) {
      logger.error(`Hammadde oluşturulamadı (${trimmedCode}):`, e);
    }
  }

  /** Yeni müşteri kodu üret (MUS-0001 formatında) */
  private generateNextCustomerCode(): string {
    const lastOrder = this.db.prepare("SELECT customer_code FROM orders WHERE customer_code LIKE 'MUS-%' ORDER BY customer_code DESC LIMIT 1").get() as any;
    let nextNum = 1;
    if (lastOrder && lastOrder.customer_code) {
      const currentNum = parseInt(lastOrder.customer_code.replace(/[^0-9]/g, '')) || 0;
      nextNum = currentNum + 1;
    }
    return `MUS-${String(nextNum).padStart(4, '0')}`;
  }

  async getOrders(filters: { status?: string; dealer_name?: string; search?: string; page?: number; pageSize?: number } = {}) {
    const limit = filters.pageSize || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const [items, total] = await Promise.all([
      this.repository.findAll({ ...filters, limit, offset }),
      this.repository.count(filters)
    ]);

    return {
      items,
      pagination: {
        total,
        page: filters.page || 1,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getOrderById(id: string) {
    return this.repository.findById(id);
  }

  async createOrder(data: any, userId?: string) {
    // Validate
    const validated = OrderCreateSchema.parse(data);
    const results: Order[] = [];

    // Process each order in the transaction
    const trans = this.db.transaction(() => {
      for (const item of validated.orders) {
        // Business Logic: Auto-create account and material
        this.createAccountIfNotExists(item.dealer_name || null);
        this.createMaterialIfNotExists(item.fabric_code || null);

        // Auto-generate customer code if missing
        const customerCode = item.customer_code || this.generateNextCustomerCode();

        // Combined notes for historical detail compatibility
        let combinedNotes = item.notes || '';
        const traits = [
          { label: 'Kumaş', value: item.fabric_code },
          { label: 'Kasa', value: item.case_info },
          { label: 'Ayak', value: item.leg_info },
          { label: 'Kirlent', value: item.cushion_info },
          { label: 'Birim', value: item.unit }
        ];

        traits.forEach(t => {
          if (t.value) combinedNotes += (combinedNotes ? ' | ' : '') + `${t.label}: ${t.value}`;
        });

        const order = this.repository.create({
          ...item,
          customer_code: customerCode,
          notes: combinedNotes,
          status: 'pending'
        });
        
        results.push(order);

        // Log Audit
        if (userId) {
          logAudit(this.db, {
            userId,
            action: 'create',
            tableName: 'orders',
            recordId: order.id,
            after: order,
          });
        }
      }
    });
    
    trans();
    
    // Agentic Logic: Process materials for each new order
    results.forEach(order => {
      try {
        const { AgenticService } = require('./agentic');
        AgenticService.processOrderMaterials(order.id, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID);
      } catch (e) {
        logger.error(`Agi-Agent failed for order ${order.id}:`, e);
      }
    });

    return results;
  }

  async updateOrder(id: string, data: any, userId?: string) {
    const validated = OrderItemSchema.parse(data);
    const oldOrder = this.repository.findById(id);
    if (!oldOrder) throw new Error('Sipariş bulunamadı');

    // Auto-create/validate side effects
    this.createAccountIfNotExists(validated.dealer_name || null);
    if (validated.fabric_code) this.createMaterialIfNotExists(validated.fabric_code);

    // Combined notes
    let combinedNotes = validated.notes || '';
    const traits = [
      { label: 'Kumaş', value: validated.fabric_code },
      { label: 'Kasa', value: validated.case_info },
      { label: 'Ayak', value: validated.leg_info },
      { label: 'Kirlent', value: validated.cushion_info },
      { label: 'Birim', value: validated.unit }
    ];

    traits.forEach(t => {
      if (t.value) combinedNotes += (combinedNotes ? ' | ' : '') + `${t.label}: ${t.value}`;
    });

    const updatedOrder = this.repository.update(id, {
      ...validated,
      notes: combinedNotes
    });

    if (userId && updatedOrder) {
      logAudit(this.db, {
        userId,
        action: 'update',
        tableName: 'orders',
        recordId: id,
        before: oldOrder,
        after: updatedOrder,
      });
    }

    return updatedOrder;
  }

  async updateOrderStatus(id: string, status: string, userId?: string, reason?: string) {
    const oldOrder = this.repository.findById(id);
    if (!oldOrder) throw new Error('Sipariş bulunamadı');

    const updatedOrder = this.repository.update(id, { 
      status,
      cancel_reason: reason || null
    });

    if (userId && updatedOrder) {
      logAudit(this.db, {
        userId,
        action: 'update',
        tableName: 'orders',
        recordId: id,
        before: oldOrder,
        after: updatedOrder,
      });
    }

    return updatedOrder;
  }

  async deleteOrder(id: string, userId?: string) {
    const order = this.repository.findById(id);
    if (!order) throw new Error('Sipariş bulunamadı');

    const success = this.repository.delete(id);

    if (success && userId) {
      logAudit(this.db, {
        userId,
        action: 'delete',
        tableName: 'orders',
        recordId: id,
        before: order,
      });
    }

    return success;
  }

  async deleteAllOrders(userId?: string) {
    const success = this.repository.deleteAll();

    if (success && userId) {
      logAudit(this.db, {
        userId,
        action: 'delete',
        tableName: 'orders',
        recordId: 'all'
      });
    }

    return success;
  }
}
