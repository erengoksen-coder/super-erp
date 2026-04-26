import { getDatabase } from '@/lib/database/db';
import { randomUUID } from 'crypto';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  selling_price: number;
  company_id: string;
  branch_id: string;
  stock_amount?: number;
}

export class ProductRepository {
  constructor(private db = getDatabase()) {}

  async findAll(companyId: string, branchId: string): Promise<Product[]> {
    return this.db.prepare(`
      SELECT * FROM products 
      WHERE deleted_at IS NULL AND company_id = ? AND branch_id = ?
      ORDER BY sku
    `).all(companyId, branchId) as Product[];
  }

  async findById(id: string, companyId: string, branchId: string): Promise<Product | null> {
    return this.db.prepare(`
      SELECT * FROM products 
      WHERE id = ? AND deleted_at IS NULL AND company_id = ? AND branch_id = ?
    `).get(id, companyId, branchId) as Product | null;
  }

  async create(data: Omit<Product, 'id'>): Promise<Product> {
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO products (id, name, sku, price, selling_price, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.sku, data.price, data.selling_price, data.company_id, data.branch_id);
    
    return { id, ...data };
  }

  async getRealStock(productId: string, companyId: string, branchId: string): Promise<number> {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM product_serial_numbers psn
      LEFT JOIN production_orders po ON psn.production_order_id = po.id
      WHERE psn.product_id = ?
        AND psn.status = 'in_stock'
        AND po.company_id = ? AND po.branch_id = ?
        AND (psn.production_order_id IS NULL OR po.status = 'completed')
    `).get(productId, companyId, branchId) as any;
    
    return result?.count || 0;
  }
}

export const productRepository = new ProductRepository();
