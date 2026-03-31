import { NextRequest } from 'next/server';
import { OrderService, OrderCreateSchema, OrderItemSchema } from '@/lib/services/orderService';
import { withHandlers } from '@/lib/api/withHandlers';
import { ok, fail } from '@/lib/api/response';

const orderService = new OrderService();

// GET: Tüm siparişleri getir
export const GET = withHandlers(async (req) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || undefined;
  const dealer_name = searchParams.get('dealer_name') || undefined;
  const search = searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const result = await orderService.getOrders({ status, dealer_name, search, page, pageSize });
  return ok(result.items, { meta: result.pagination });
}, { permission: { path: '/orders', action: 'view' } });

// POST: Yeni sipariş oluştur
export const POST = withHandlers(async (req, ctx) => {
  const result = await orderService.createOrder(ctx.body, ctx.user?.userId);
  return ok(result, { message: `${result.length} sipariş başarıyla oluşturuldu` });
}, { 
  schema: OrderCreateSchema, 
  permission: { path: '/orders', action: 'create' } 
});

// PUT: Sipariş güncelle
export const PUT = withHandlers(async (req, ctx) => {
  const id = (ctx.body as any).id;
  if (!id) return fail('Sipariş ID zorunludur', { status: 400 });
  
  const result = await orderService.updateOrder(id, ctx.body, ctx.user?.userId);
  return ok(result, { message: 'Sipariş başarıyla güncellendi' });
}, { 
  schema: OrderItemSchema, // Using ItemSchema for single update
  permission: { path: '/orders', action: 'edit' } 
});

// PATCH: Sipariş durumunu güncelle (ör: İptal)
export const PATCH = withHandlers(async (req, ctx) => {
  const body = await req.json();
  const { id, status, reason } = body;
  
  if (!id || !status) return fail('ID ve durum bilgisi zorunludur', { status: 400 });
  
  const result = await orderService.updateOrderStatus(id, status, ctx.user?.userId, reason);
  return ok(result, { message: 'Sipariş durumu güncellendi' });
}, { permission: { path: '/orders', action: 'edit' } });

// DELETE: Sipariş sil
export const DELETE = withHandlers(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const all = searchParams.get('all') === '1';
  
  if (all) {
    await orderService.deleteAllOrders(ctx.user?.userId);
    return ok(null, { message: 'Tüm siparişler başarıyla silindi' });
  }

  if (!id) return fail('Sipariş ID zorunludur', { status: 400 });
  
  await orderService.deleteOrder(id, ctx.user?.userId);
  return ok(null, { message: 'Sipariş başarıyla silindi' });
}, { permission: { path: '/orders', action: 'delete' } });
