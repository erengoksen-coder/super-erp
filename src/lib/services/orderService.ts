import { OrderRepository, Order } from '../repositories/orderRepository';
import { logAudit } from '../audit';
import { z } from 'zod';
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID } from '../database/db';
import { logger } from '../utils/logger';

type Db = ReturnType<typeof getDatabase>;

export const OrderItemSchema = z.object({
  product_name: z.string().min(1, 'Ürün adı zorunludur'),
  configuration: z.string().optional(),
  fabric_code: z.string().optional(),
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
  private repository: any;
  private db: any;

  constructor(db?: any, repository?: any) {
    this.db = db || getDatabase();
    this.repository = repository || new OrderRepository(this.db);
  }

  /** Bayi isminden otomatik cari hesap oluştur */
  private createAccountIfNotExists(dealerName: string | null, companyId: string, branchId: string): void {
    if (!dealerName || !dealerName.trim()) return;
    const trimmedName = dealerName.trim();
    
    try {
      // 1. CRM Accounts Tablosu
      const existingAcc = this.db.prepare('SELECT id FROM accounts WHERE LOWER(name) = LOWER(?) AND company_id = ?').get(trimmedName, companyId) as any;
      
      const lastRow = this.db.prepare("SELECT code FROM accounts WHERE code LIKE 'MUS-%' ORDER BY code DESC LIMIT 1").get() as any;
      const lastNum = lastRow ? (parseInt(lastRow.code.split('-')[1]) || 0) : 0;
      const code = `MUS-${String(lastNum + 1).padStart(4, '0')}`;
      const id = existingAcc?.id || `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      if (!existingAcc) {
        this.db.prepare('INSERT INTO accounts (id, code, name, type, company_id, branch_id, is_approved) VALUES (?, ?, ?, ?, ?, ?, 1)')
          .run(id, code, trimmedName, 'customer', companyId, branchId);
      }

      // 2. Muhasebe Chart of Accounts (COA) Tablosu - Finans ekranı için kritik
      const existingCoa = this.db.prepare('SELECT id FROM chart_of_accounts WHERE LOWER(name) = LOWER(?) AND company_id = ?').get(trimmedName, companyId) as any;
      if (!existingCoa) {
        const coaId = `coa-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const coaCode = `120.01.${String(lastNum + 1).padStart(3, '0')}`;
        // coa_120: Alacaklar / Alıcılar parent hesabı
        this.db.prepare('INSERT INTO chart_of_accounts (id, code, name, account_type, type, parent_id, company_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(coaId, coaCode, trimmedName, 'receivable', 'receivable', 'coa_120', companyId, branchId);
      }
      
      logger.info(`Synced account: ${trimmedName}`);
    } catch (error) {
      logger.error('Error syncing auto-account:', error);
    }
  }

  /** Kumaş kodu varsa hammaddeye ekle */
  private createMaterialIfNotExists(fabricCode: string | null, companyId: string, branchId: string): void {
    if (!fabricCode || !fabricCode.trim()) return;
    const trimmedCode = fabricCode.trim();

    try {
      // Case-insensitive check
      const existing = this.db.prepare('SELECT id FROM materials WHERE LOWER(code) = LOWER(?) AND company_id = ?').get(trimmedCode, companyId) as any;
      if (existing) return;

      const id = `mat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Create material with all UI fields
      this.db.prepare('INSERT INTO materials (id, code, name, category, unit, stock_amount, company_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, 
        trimmedCode, 
        trimmedCode, 
        'KUMAŞ',
        'ADET',
        0,
        companyId,
        branchId
      );

      // Create initial stock in KMS warehouse
      const stockId = `stk-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.db.prepare('INSERT INTO material_stocks (id, material_id, warehouse_id, quantity, company_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)').run(
        stockId,
        id,
        "warehouse_default", 
        0,
        companyId,
        branchId
      );
      
      logger.info(`Auto-created material: ${trimmedCode}`);
    } catch (error) {
      logger.error('Error creating auto-material:', error);
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

  async getOrders(filters: any = {}, companyId?: string, branchId?: string) {
    const limit = filters.pageSize || 50;
    const offset = ((filters.page || 1) - 1) * limit;

    const [items, total] = await Promise.all([
      this.repository.findAll({ ...filters, companyId, branchId, limit, offset }),
      this.repository.count({ ...filters, companyId, branchId })
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

  async createOrder(data: any, companyId: string, branchId: string, userId?: string) {
    // Validate
    const validated = OrderCreateSchema.parse(data);
    const results: Order[] = [];

    // Process each order in the transaction
    const trans = this.db.transaction(() => {
      for (const item of validated.orders) {
        // Business Logic: Auto-create account and material
        this.createAccountIfNotExists(item.dealer_name || null, companyId, branchId);
        this.createMaterialIfNotExists(item.fabric_code || null, companyId, branchId);

        // EXTRA SAFETY: Extract configuration from product name or notes if empty (Backend Safety Net)
        if (!item.configuration) {
          const normalizeStr = (s: any) => String(s || '')
                .replace(/İ/g, 'i').replace(/I/g, 'ı')
                .replace(/Ü/g, 'ü').replace(/ü/g, 'ü')
                .replace(/Ö/g, 'ö').replace(/ö/g, 'ö')
                .replace(/Ş/g, 'ş').replace(/ş/g, 'ş')
                .replace(/Ç/g, 'ç').replace(/ç/g, 'ç')
                .replace(/Ğ/g, 'ğ').replace(/ğ/g, 'ğ')
                .toLowerCase();

          const combinedText = normalizeStr(item.product_name) + ' ' + normalizeStr(item.notes);
          // ultra flexible regex for 3lü, 3'lü, 3-lü, 3 lü, üçlü, etc.
          const configMatches = combinedText.match(/(3[\s\-\'’\.]*l[\s]*[üu]|\b3[\s\-\'’]+l[\s]*[üu]|üçlü|uclü|uclu|berjer|tekli|mod[üu]l|k[öo]se|ikili|sofa|puf|josephin)/i);
          if (configMatches) {
            item.configuration = configMatches[0].toUpperCase();
          }
        }

        // Auto-generate customer code if missing
        const customerCode = item.customer_code || this.generateNextCustomerCode();

        // Combined notes for historical detail compatibility
        let combinedNotes = item.notes || '';
        const traits = [
          { label: 'Yapılandırma', value: item.configuration },
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
          product_sku: item.fabric_code || item.product_sku || null, // Map Excel fabric_code to product_sku
          customer_code: customerCode,
          notes: combinedNotes,
          status: 'pending',
          company_id: companyId,
          branch_id: branchId
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
        AgenticService.processOrderMaterials(order.id, companyId, branchId);
      } catch (e) {
        logger.error(`Agi-Agent failed for order ${order.id}:`, e);
      }
    });

    return results;
  }

  async updateOrder(id: string, data: any, companyId: string, branchId: string, userId?: string) {
    const validated = OrderItemSchema.parse(data);
    const oldOrder = this.repository.findById(id);
    if (!oldOrder) throw new Error('Sipariş bulunamadı');

    // Auto-create/validate side effects
    this.createAccountIfNotExists(validated.dealer_name || null, companyId, branchId);
    if (validated.fabric_code) this.createMaterialIfNotExists(validated.fabric_code, companyId, branchId);

    // Combined notes
    let combinedNotes = validated.notes || '';
    const traits = [
      { label: 'Yapılandırma', value: validated.configuration },
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

  async updateOrderStatus(id: string, status: string, companyId?: string, branchId?: string, userId?: string, reason?: string) {
    const oldOrder = this.repository.findById(id);
    if (!oldOrder) throw new Error('Sipariş bulunamadı');

    // Security check: ensure order belongs to the company
    if (companyId && oldOrder.company_id !== companyId) {
      throw new Error('Siparişi güncelleme yetkiniz yok');
    }

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

  async deleteOrder(id: string, companyId?: string, branchId?: string, userId?: string) {
    console.log(`[OrderService] deleteOrder: id=${id}, companyId=${companyId}, branchId=${branchId}, userId=${userId}`);
    const order = this.repository.findById(id);
    if (!order) throw new Error('Sipariş bulunamadı');

    const success = this.repository.delete(id, companyId, branchId);
    console.log(`[OrderService] deleteOrder success: ${success}`);

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

  async deleteAllOrders(companyId?: string, branchId?: string, userId?: string) {
    console.log(`[OrderService] deleteAllOrders: companyId=${companyId}, branchId=${branchId}, userId=${userId}`);
    const success = this.repository.deleteAll(companyId, branchId);
    console.log(`[OrderService] deleteAllOrders success: ${success}`);

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
