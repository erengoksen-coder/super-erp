import { NextRequest } from 'next/server';
import { OrderService, OrderCreateSchema, OrderItemSchema } from '@/lib/services/orderService';
import { withHandlers } from '@/lib/api/withHandlers';
import { ok, fail } from '@/lib/api/response';
import { getDatabase } from '@/lib/database/db';
import { OrderRepository } from '@/lib/repositories/orderRepository';

export const dynamic = 'force-dynamic';

function getService() {
  const db = getDatabase();
  const repository = new OrderRepository(db);
  return new OrderService(db, repository);
}

// GET: Tüm siparişleri getir
export const GET = withHandlers(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const dealer_name = searchParams.get('dealer_name') || undefined;
  const search = searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const { companyId, branchId } = ctx?.user || {};
  const service = getService();
  const result = await service.getOrders({ status, dealer_name, search, page, pageSize }, companyId, branchId);
  return ok(result.items, { meta: result.pagination });
}, { permission: { path: '/orders', action: 'view' } });

// POST: Yeni sipariş oluştur
export const POST = withHandlers(async (req, ctx) => {
  const { companyId, branchId, userId } = ctx?.user || {};
  const service = getService();
  const result = await service.createOrder(ctx.body, companyId, branchId, userId);
  return ok(result, { message: `${result.length} sipariş başarıyla aktarıldı` });
}, { 
  schema: OrderCreateSchema, 
  permission: { path: '/orders', action: 'create' } 
});

// PUT: Sipariş güncelle
export const PUT = withHandlers(async (req, ctx) => {
  const id = (ctx.body as any)?.id;
  if (!id) return fail('Sipariş ID zorunludur', { status: 400 });
  
  const { companyId, branchId, userId } = ctx?.user || {};
  const service = getService();
  const result = await service.updateOrder(id, ctx.body, companyId, branchId, userId);
  return ok(result, { message: 'Sipariş başarıyla güncellendi' });
}, { 
  schema: OrderItemSchema,
  permission: { path: '/orders', action: 'edit' } 
});

// PATCH: Sipariş durumunu güncelle
export const PATCH = withHandlers(async (req, ctx) => {
  const body = await req.json();
  const { id, status, reason } = body;
  
  if (!id || !status) return fail('ID ve durum bilgisi zorunludur', { status: 400 });
  
  const { companyId, branchId, userId } = ctx?.user || {};
  const service = getService();
  const result = await service.updateOrderStatus(id, status, companyId, branchId, userId, reason);
  return ok(result, { message: 'Sipariş durumu güncellendi' });
}, { permission: { path: '/orders', action: 'edit' } });

// DELETE: Sipariş sil
export const DELETE = withHandlers(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const all = searchParams.get('all') === '1';
  
  const { companyId, branchId, userId } = ctx?.user || {};
  const service = getService();
  
  if (all) {
    if (!companyId) return fail('Şirket bilgisi bulunamadı, silme işlemi yapılamaz', { status: 400 });
    await service.deleteAllOrders(companyId, branchId, userId);
    return ok(null, { message: 'Tüm siparişler başarıyla silindi' });
  }

  if (!id) return fail('Sipariş ID zorunludur', { status: 400 });
  
  await service.deleteOrder(id, companyId, branchId, userId);
  return ok(null, { message: 'Sipariş başarıyla silindi' });
}, { permission: { path: '/orders', action: 'delete' } });
