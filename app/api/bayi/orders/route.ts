import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';
import { v4 as uuidv4 } from 'uuid';
import { sendOrderNotificationToChannels } from '@/lib/messaging/order-notification';

// Bayiler için e-ticaret tarzı sipariş oluşturma
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Sepet boş olamaz.' }, { status: 400 });
    }

    const db = getDatabase();
    db.pragma('foreign_keys = OFF'); // İşlem bütünlüğü (transaction) öncesi pragma ayarlamaları

    let orderId = '';
    let orderNumber = '';
    let totalAmount = 0;

    // Transaction başlat
    const transaction = db.transaction(() => {
      orderId = `ord_${uuidv4().replace(/-/g, '')}`;

      // Bayinin şirket ve şube ID'si veya default
      const companyId = 'company_default';
      const branchId = 'branch_default';

      // Sipariş numarası oluştur (Örn: ORD-BAYI-202X)
      const countRow = db.prepare('SELECT count(*) as c FROM orders WHERE company_id = ?').get(companyId) as { c: number };
      orderNumber = `ORD-B2B-${new Date().getFullYear()}${(countRow.c + 1).toString().padStart(4, '0')}`;

      // Siparişi (Kasa Fişi mantığı) oluştur
      let subtotal = 0;

      for (const item of items) {
        const sub = (item.dealer_price || 0) * (item.quantity || 1);
        subtotal += sub;
      }
      // %20 KDV varsayımıyla vergileme
      const taxAmount = subtotal * 0.20;
      totalAmount = subtotal + taxAmount;

      // Bayinin dealer_name bilgisini al
      const userInfo = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(user.userId) as { dealer_name: string | null } | undefined;
      const dealerName = userInfo?.dealer_name || user.userId || 'Bayi';

      // `orders` tablosuna kayıt
      db.prepare(`
                INSERT INTO orders (
                    id, order_number, dealer_name, type, status, customer_id, branch_id, company_id,
                    subtotal, tax_amount, total_amount, currency, exchange_rate,
                    sales_representative_id, created_by, order_date, expected_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
        orderId,
        orderNumber,
        dealerName,
        'sales',             // type
        'approval_pending',  // status (onay bekliyor)
        user.userId,         // customer_id = bayi_id
        branchId,
        companyId,
        subtotal,            // subtotal
        taxAmount,           // tax
        totalAmount,         // total
        'TRY',               // currency
        1,                   // exchange rate
        user.userId,         // satıcı temsilcisi yine bayi olarak kaydediliyor ki kendi bilsin
        user.userId,         // created_by
        new Date().toISOString(), // order date
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 gün sonrası expected_date
      );

      // Sipariş Kalemlerini (`order_items`) kaydet
      const insertItem = db.prepare(`
                INSERT INTO order_items (
                    id, order_id, product_id, quantity, unit_price, tax_rate, tax_amount, total_price, status, company_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

      for (const item of items) {
        const itemId = `oi_${uuidv4().replace(/-/g, '')}`;
        const uPrice = item.dealer_price || 0;
        const qty = item.quantity || 1;
        const tPrice = uPrice * qty;
        const tTax = tPrice * 0.20;

        const isManual = !item.id || item.id.startsWith('manual_');
        const productId = isManual ? null : item.id;

        insertItem.run(
          itemId,
          orderId,
          productId,
          qty,
          uPrice,
          20,               // %20 kdv
          tTax,
          tPrice + tTax,
          'pending',        // kalem durumu (production tracking için lazım)
          companyId
        );
      }

      // Onay Eşiği Kontrolü (app_settings'den oku - varsayılan olarak tutarı yazmak için)
      const thresholdRow = db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get('order_approval_threshold') as { setting_value: string } | undefined;
      const threshold = Number(thresholdRow?.setting_value ?? '0');

      // Bayi siparişleri HER ZAMAN order_approvals tablosuna kayıt atar
      const approvalId = `apr_${uuidv4().replace(/-/g, '')}`;
      db.prepare(`
        INSERT INTO order_approvals (
          id, order_id, requested_by, requested_at, status, order_amount, threshold_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        approvalId,
        orderId,
        user.userId,
        new Date().toISOString(),
        'pending',
        totalAmount,
        threshold
      );
    });

    // Transaction'ı çalıştır
    transaction();

    // Telegram / WhatsApp Bildirimi Gönder (Async)
    try {
      sendOrderNotificationToChannels({
        orders: items.map(it => ({
          order_number: orderNumber,
          product_name: it.name || 'Bilinmeyen Ürün',
          quantity: it.quantity || 1,
          customer_name: (user as any)?.dealer_name || user.userId
        }))
      }).catch(err => console.error('Telegram notification error:', err));
    } catch (e) {
      console.error('Notification dispatch error:', e);
    }

    return NextResponse.json({ success: true, message: 'Sipariş başarıyla oluşturuldu.', orderId, orderNumber });

  } catch (error: any) {
    console.error('B2B Sipariş Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// Bayinin kendi siparişlerini listeleme
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Bayinin dealer_name bilgisini al
    const userInfo = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(user.userId) as { dealer_name: string | null } | undefined;
    const dealerName = userInfo?.dealer_name || '';

    let query = `
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT p.name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id LIMIT 1) as first_product_name,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_quantity
      FROM orders o
      WHERE (o.customer_id = ? OR (o.customer_id IS NULL AND o.dealer_name = ?)) 
        AND o.deleted_at IS NULL
    `;
    const params: any[] = [user.userId, dealerName];

    if (status && status !== 'all') {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const rows = db.prepare(query).all(...params) as any[];

    // Frontend beklentilerine göre veriyi map'le
    const orders = rows.map(row => ({
      id: row.id,
      order_number: row.order_number,
      dealer_name: row.dealer_name,
      customer_name: row.customer_name,
      product_name: row.item_count > 1
        ? `${row.first_product_name || 'Ürün'} (+${row.item_count - 1} ürün daha)`
        : (row.first_product_name ? String(row.first_product_name).trim() || '—' : '—'),
      product_sku: row.item_count > 1 ? 'MULTI' : 'SINGLE',
      quantity: row.total_quantity || 0,
      unit_price: row.subtotal / (row.total_quantity || 1),
      total_amount: row.total_amount,
      order_date: row.order_date || row.created_at,
      status: row.status,
      cancel_reason: row.cancel_reason || null,
      created_at: row.created_at
    }));

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error('B2B Sipariş Listesi Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

