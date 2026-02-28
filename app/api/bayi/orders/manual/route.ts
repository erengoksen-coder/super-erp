import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';
import { v4 as uuidv4 } from 'uuid';
import { sendOrderNotificationToChannels } from '@/lib/messaging/order-notification';
import { ok, fail } from '@/lib/api/response';

export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const body = await request.json();
        const {
            order_number,
            order_date,
            customer_name,
            product_name,
            product_sku,
            quantity,
            unit_price,
            configuration,
            fabric_code,
            case_info,
            leg_info,
            cushion_info,
            unit,
            notes,
            includeKDV
        } = body;

        if (!product_name || !fabric_code) {
            return fail('Ürün adı ve kumaş kodu zorunludur.', { status: 400 });
        }

        const db = getDatabase();
        db.pragma('foreign_keys = OFF');
        const companyId = 'company_default';
        const branchId = 'branch_default';

        // Bayinin dealer_name bilgisini veritabanından al
        const userInfo = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(user.userId) as { dealer_name: string | null } | undefined;
        const dealerName = userInfo?.dealer_name || user.userId || 'Bayi';

        let finalOrderNumber = order_number;
        let orderId = '';
        let subtotal = (quantity || 1) * (unit_price || 0);
        let taxRate = includeKDV ? 20 : 0;
        let taxAmount = subtotal * (taxRate / 100);
        let totalAmount = subtotal + taxAmount;

        const transaction = db.transaction(() => {
            orderId = `ord_${uuidv4().replace(/-/g, '')}`;

            if (!finalOrderNumber) {
                const countRow = db.prepare('SELECT count(*) as c FROM orders WHERE company_id = ?').get(companyId) as { c: number };
                finalOrderNumber = `ORD-B2B-${new Date().getFullYear()}${(countRow.c + 1).toString().padStart(4, '0')}`;
            }

            // Notları birleştir (Ana ERP mantığı ile aynı)
            let combinedNotes = notes || '';
            if (fabric_code) combinedNotes += (combinedNotes ? ' | ' : '') + `Kumaş: ${fabric_code}`;
            if (case_info) combinedNotes += (combinedNotes ? ' | ' : '') + `Kasa: ${case_info}`;
            if (leg_info) combinedNotes += (combinedNotes ? ' | ' : '') + `Ayak: ${leg_info}`;
            if (cushion_info) combinedNotes += (combinedNotes ? ' | ' : '') + `Kirlent: ${cushion_info}`;
            if (unit) combinedNotes += (combinedNotes ? ' | ' : '') + `Birim: ${unit}`;

            // Ürün ID'sini bulmaya çalış
            let productId = null;
            if (product_sku) {
                const prod = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(product_sku) as any;
                if (prod) productId = prod.id;
            }
            if (!productId && product_name) {
                const prod = db.prepare('SELECT id FROM active_products WHERE name LIKE ?').get(`%${product_name}%`) as any;
                if (prod) productId = prod.id;
            }

            const thresholdRow = db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get('order_approval_threshold') as any;
            const threshold = Number(thresholdRow?.setting_value ?? '0');
            // Bayi siparişleri her zaman onaya düşer
            const orderStatus = 'approval_pending';

            const d = new Date().toISOString();

            db.prepare(`
        INSERT INTO orders (
          id, order_number, dealer_name, customer_name, product_name, product_sku,
          product_id, quantity, unit_price, total_amount, order_date, type, status,
          configuration, notes, company_id, branch_id, created_at, customer_id, created_by,
          subtotal, tax_amount, currency, exchange_rate, sales_representative_id
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, 'sales', ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, 'TRY', 1, ?
        )
      `).run(
                orderId, finalOrderNumber, dealerName, customer_name || null, product_name, product_sku || null,
                productId, quantity || 1, unit_price || 0, totalAmount, order_date || d, orderStatus,
                configuration || null, combinedNotes, companyId, branchId, d, user.userId, user.userId,
                subtotal, taxAmount, user.userId
            );

            // Order Items (1 item for manual order just like main ERP)
            const itemId = `oi_${uuidv4().replace(/-/g, '')}`;
            db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, quantity, unit_price, tax_rate, tax_amount, total_price, status, company_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(itemId, orderId, productId, quantity || 1, unit_price || 0, taxRate, taxAmount, totalAmount, companyId);

            // Her zaman onaya düşürür
            const approvalId = `apr_${uuidv4().replace(/-/g, '')}`;
            db.prepare(`
          INSERT INTO order_approvals (id, order_id, requested_by, requested_at, status, order_amount, threshold_amount)
          VALUES (?, ?, ?, ?, 'pending', ?, ?)
        `).run(approvalId, orderId, user.userId, d, totalAmount, threshold);

            // Bildirim oluştur (Yöneticiler için tek tek kayıt ekle)
            const adminUsers = db.prepare("SELECT id FROM users WHERE role IN ('admin', 'yonetici', 'planlama')").all() as { id: string }[];

            if (adminUsers.length > 0) {
                const insertNotification = db.prepare(`
                INSERT INTO notifications (id, user_id, title, message, type, link)
                VALUES (?, ?, ?, ?, 'warning', ?)
              `);

                for (const admin of adminUsers) {
                    insertNotification.run(
                        uuidv4(),
                        admin.id,
                        'Bayi Siparişi Onay Bekliyor',
                        `${dealerName} tarafından oluşturulan ${finalOrderNumber} nolu sipariş onay bekliyor.`,
                        '/admin/approvals'
                    );
                }
            }

            // Bayi'ye de siparişin ulaştığına dair bildirim gönder
            db.prepare(`
                INSERT INTO notifications (id, user_id, title, message, type, link)
                VALUES (?, ?, ?, ?, 'info', ?)
            `).run(
                uuidv4(),
                user.userId,
                'Siparişiniz Alındı',
                `${finalOrderNumber} nolu siparişiniz başarıyla oluşturuldu ve onaya sunuldu.`,
                '/bayi/orders'
            );
        });

        transaction();

        // Telegram Notification
        try {
            sendOrderNotificationToChannels({
                orders: [{
                    order_number: finalOrderNumber,
                    product_name: product_name,
                    quantity: quantity || 1,
                    customer_name: dealerName
                }]
            }).catch(err => console.error('Telegram error:', err));
        } catch (e) { }

        return ok({ message: 'Sipariş başarıyla oluşturuldu.', orderId, orderNumber: finalOrderNumber });

    } catch (error: any) {
        console.error('Bayi Manual Order Error:', error);
        return fail('Sipariş oluşturulurken bir sistem hatası oluştu: ' + error.message);
    }
});
