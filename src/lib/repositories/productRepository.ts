import { getDatabase } from '@/lib/database/db';
import { randomUUID } from 'crypto';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  selling_price: number;
  stock_amount: number;
  min_stock_level: number;
  labor_cost: number;
  company_id: string;
  branch_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ProductRepository {
  private db = getDatabase();

  findAll(filters: { search?: string; limit?: number; offset?: number } = {}) {
    const columns = [
      'id', 'name', 'sku', 'price', 'selling_price', 'stock_amount', 
      'min_stock_level', 'labor_cost', 'created_at'
    ].join(', ');

    let sql = `SELECT ${columns} FROM products WHERE deleted_at IS NULL`;
    const params: any[] = [];

    if (filters.search) {
      sql += ' AND (name LIKE ? OR sku LIKE ?)';
      const p = `%${filters.search}%`;
      params.push(p, p);
    }

    sql += ' ORDER BY name ASC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return this.db.prepare(sql).all(...params) as Product[];
  }

  findById(id: string): Product | null {
    return this.db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(id) as Product || null;
  }

  findBySku(sku: string): Product | null {
    return this.db.prepare('SELECT * FROM products WHERE sku = ? AND deleted_at IS NULL').get(sku) as Product || null;
  }

  create(data: Partial<Product>): Product {
    const id = data.id || randomUUID();
    const now = new Date().toISOString();
    
    const columns = [
      'id', 'name', 'sku', 'price', 'selling_price', 
      'stock_amount', 'min_stock_level', 'labor_cost',
      'company_id', 'branch_id', 'created_at', 'updated_at'
    ];

    const values = [
      id,
      data.name || 'Adsız Ürün',
      data.sku || `PRD-${Date.now()}`,
      data.price || 0,
      data.selling_price || 0,
      data.stock_amount || 0,
      data.min_stock_level || 5,
      data.labor_cost || 0,
      data.company_id || 'company_default',
      data.branch_id || 'branch_default',
      now,
      now
    ];

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO products (${columns.join(', ')}) VALUES (${placeholders})`;

    this.db.prepare(sql).run(...values);
    return this.findById(id)!;
  }

  update(id: string, data: Partial<Product>): Product | null {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'deleted_at') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    this.db.prepare(sql).run(...values);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const now = new Date().toISOString();
    const result = this.db.prepare('UPDATE products SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
    return result.changes > 0;
  }

  count(filters: { search?: string } = {}): number {
    let sql = 'SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL';
    const params: any[] = [];

    if (filters.search) {
      sql += ' AND (name LIKE ? OR sku LIKE ?)';
      const p = `%${filters.search}%`;
      params.push(p, p);
    }

    const row = this.db.prepare(sql).get(...params) as { count: number };
    return row.count;
  }
}