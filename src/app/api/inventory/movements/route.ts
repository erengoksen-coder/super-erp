import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { ok, fail } from '@/lib/api/response';
import { handleApi } from '@/lib/api/handler';
import { getDatabase } from '@/lib/database/db';
import { logInfo, logError } from '@/lib/logger';
import { z } from 'zod';
import { randomUUID } from 'crypto';

/**
 * Livasofa ERP Inventory Movements API
 * Handles recording of stock-in, stock-out and adjustments.
 */

const movementSchema = z.object({
  product_id: z.string().uuid('Geçerli bir ürün ID seçilmelidir'),
  type: z.enum(['in', 'out', 'transfer', 'adjustment']),
  quantity: z.number().positive('Miktar pozitif olmalıdır'),
  reference_type: z.string().optional(),
  reference_id: z.string().optional(),
  warehouse_id: z.string().default('wh_main'),
  notes: z.string().optional(),
});

// GET: Stok hareketlerini listele (Ürün veya Genel)
export const GET = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const { companyId } = authUser;
    
    const db = getDatabase();
    
    let query = `
      SELECT m.*, p.name as product_name, p.code as product_code
      FROM inventory_movements m
      JOIN products p ON m.product_id = p.id
      WHERE m.company_id = ?
    `;
    const params: any[] = [companyId];
    
    if (productId) {
      query += ` AND m.product_id = ?`;
      params.push(productId);
    }
    
    query += ` ORDER BY m.created_at DESC LIMIT 100`;
    
    const rows = db.prepare(query).all(...params);
    return ok(rows);
  });
});

// POST: Yeni stok hareketi kaydet (Audit Log dahil)
export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser;
    const body = await request.json();
    
    const result = movementSchema.safeParse(body);
    if (!result.success) {
      return fail(result.error.errors[0].message, { status: 400 });
    }

    const db = getDatabase();
    const id = randomUUID();
    
    db.transaction(() => {
      // 1. Hareket Kaydı
      db.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, type, quantity, reference_type, 
          reference_id, warehouse_id, notes, created_by, company_id, branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, result.data.product_id, result.data.type, result.data.quantity,
        result.data.reference_type || null, result.data.reference_id || null,
        result.data.warehouse_id, result.data.notes || null,
        userId, companyId, branchId
      );

      // 2. Ana Ürün Stok Güncelleme (Basit Mantık)
      const multiplier = result.data.type === 'in' ? 1 : -1;
      db.prepare('UPDATE products SET stock_amount = stock_amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(result.data.quantity * multiplier, result.data.product_id);
    })();

    logInfo('Stok hareketi işlendi', { type: result.data.type, product_id: result.data.product_id });
    return ok({ id }, { message: 'Stok hareketi başarıyla kaydedildi' });
  });
});
