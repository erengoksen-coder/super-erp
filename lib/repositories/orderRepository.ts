import { getDatabase } from '@/lib/database/db';
import { randomUUID } from 'crypto';

export interface Order {
  id: string;
  order_number: string | null;
  dealer_name: string | null;
  customer_name: string | null;
  customer_code: string | null;
  product_name: string | null;
  product_sku: string | null;
  product_id: string | null;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  order_date: string | null;
  delivery_date: string | null;
  status: string;
  production_order_id: string | null;
  configuration: string | null;
  notes: string | null;
  cancel_reason: string | null;
  company_id: string;
  branch_id: string;
  excel_row_number: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class OrderRepository {
  private db = getDatabase();

  findAll(filters: { status?: string; dealer_name?: string; search?: string; limit?: number; offset?: number } = {}) {
    const columns = [
      'id', 'order_number', 'dealer_name', 'customer_name', 'customer_code',
      'product_name', 'product_sku', 'quantity', 'total_amount', 'order_date',
      'status', 'notes', 'created_at'
    ].join(', ');

    let sql = `SELECT ${columns} FROM orders WHERE deleted_at IS NULL`;
    const params: any[] = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.dealer_name) {
      sql += ' AND dealer_name LIKE ?';
      params.push(`%${filters.dealer_name}%`);
    }

    if (filters.search) {
      sql += ' AND (order_number LIKE ? OR dealer_name LIKE ? OR product_name LIKE ? OR customer_name LIKE ?)';
      const p = `%${filters.search}%`;
      params.push(p, p, p, p);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return this.db.prepare(sql).all(...params) as Order[];
  }

  findById(id: string): Order | null {
    return this.db.prepare('SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL').get(id) as Order || null;
  }

  findByOrderNumber(orderNumber: string): Order | null {
    return this.db.prepare('SELECT * FROM orders WHERE order_number = ? AND deleted_at IS NULL').get(orderNumber) as Order || null;
  }

  create(data: Partial<Order>): Order {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    
    const columns = [
      'id', 'order_number', 'dealer_name', 'customer_name', 'customer_code',
      'product_name', 'product_sku', 'product_id', 'quantity', 'unit_price',
      'total_amount', 'order_date', 'delivery_date', 'status', 'production_order_id',
      'configuration', 'notes', 'company_id', 'branch_id', 'created_at', 'updated_at'
    ];

    const values = [
      id,
      data.order_number || null,
      data.dealer_name || null,
      data.customer_name || null,
      data.customer_code || null,
      data.product_name || null,
      data.product_sku || null,
      data.product_id || null,
      data.quantity || 0,
      data.unit_price || 0,
      (data.quantity || 0) * (data.unit_price || 0),
      data.order_date || now,
      data.delivery_date || null,
      data.status || 'pending',
      data.production_order_id || null,
      data.configuration || null,
      data.notes || null,
      data.company_id || 'company_default',
      data.branch_id || 'branch_default',
      now,
      now
    ];

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO orders (${columns.join(', ')}) VALUES (${placeholders})`;

    this.db.prepare(sql).run(...values);
    return this.findById(id)!;
  }

  update(id: string, data: Partial<Order>): Order | null {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const sql = `UPDATE orders SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    this.db.prepare(sql).run(...values);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const now = new Date().toISOString();
    const result = this.db.prepare('UPDATE orders SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
    return result.changes > 0;
  }

  deleteAll(): boolean {
    const now = new Date().toISOString();
    const result = this.db.prepare('UPDATE orders SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL').run(now, now);
    return result.changes > 0;
  }

  count(filters: { status?: string; dealer_name?: string; search?: string } = {}): number {
    let sql = 'SELECT COUNT(*) as count FROM orders WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.dealer_name) {
      sql += ' AND dealer_name LIKE ?';
      params.push(`%${filters.dealer_name}%`);
    }

    if (filters.search) {
      sql += ' AND (order_number LIKE ? OR dealer_name LIKE ? OR product_name LIKE ? OR customer_name LIKE ?)';
      const p = `%${filters.search}%`;
      params.push(p, p, p, p);
    }

    const row = this.db.prepare(sql).get(...params) as { count: number };
    return row.count;
  }
}
