import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';
import { v4 as uuidv4 } from 'uuid';
import { sendOrderNotificationToChannels, sendOrderFailureNotification } from '@/lib/messaging/order-notification';
import { ok, fail } from '@/lib/api/response';

export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
    let body: any = {};
    try {
        body = await request.json();
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
        const userInfo = db.prepare('SELECT dealer_name, full_name, username FROM users WHERE id = ?').get(user.userId) as { dealer_name: string | null; full_name: string | null; username: string } | undefined;
        const dealerName = userInfo?.dealer_name || userInfo?.full_name || userInfo?.username || 'Bayi';

        let finalOrderNumber = order_number;
        let orderId = '';
        const subtotal = (quantity || 1) * (unit_price || 0);
        const taxRate = includeKDV ? 20 : 0;
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;

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

            // Ürün ID'sini bulmaya çalış: ÖNCELİKLE BOM'U OLAN ÜRÜNLERİ ARA
            let productId = null;
            const searchName = product_name?.trim() || '';
            const searchSku = product_sku?.trim() || '';
            let bomProduct: any = undefined;

            if (searchName) {
                // İsme tam uyan ve BOM'u olan ürünü bul
                bomProduct = db.prepare(`
                    SELECT DISTINCT p.id 
                    FROM active_products p
                    JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
                    WHERE LOWER(p.name) = LOWER(?)
                    LIMIT 1
                `).get(searchName);

                if (!bomProduct) {
                    // Kısmen uyan BOM'lu ürünü bul
                    bomProduct = db.prepare(`
                        SELECT DISTINCT p.id 
                        FROM active_products p
                        JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
                        WHERE p.name LIKE ?
                        LIMIT 1
                    `).get(`%${searchName}%`);
                }
            }

            if (!bomProduct && searchSku) {
                bomProduct = db.prepare(`
                    SELECT DISTINCT p.id 
                    FROM active_products p
                    JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
                    WHERE p.sku = ?
                    LIMIT 1
                `).get(searchSku);
            }

            if (bomProduct?.id) {
                productId = bomProduct.id;
            } else if (searchSku) {
                const prod = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(searchSku) as any;
                if (prod) productId = prod.id;
            } else if (searchName) {
                const prod = db.prepare('SELECT id FROM active_products WHERE name LIKE ?').get(`%${searchName}%`) as any;
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
                    $id, $orderNumber, $dealerName, $customerName, $productName, $productSku,
                    $productId, $quantity, $unitPrice, $totalAmount, $orderDate, 'sales', $status,
                    $configuration, $notes, $companyId, $branchId, $createdAt, $customerId, $createdBy,
                    $subtotal, $taxAmount, 'TRY', 1, $salesRepId
                )
            `).run({
                id: orderId,
                orderNumber: finalOrderNumber,
                dealerName: dealerName,
                customerName: customer_name || 'SHOWROOM',
                productName: product_name,
                productSku: product_sku || null,
                productId: productId,
                quantity: quantity || 1,
                unitPrice: unit_price || 0,
                totalAmount: totalAmount,
                orderDate: order_date || d,
                status: orderStatus,
                configuration: configuration || null,
                notes: combinedNotes,
                companyId: companyId,
                branchId: branchId,
                createdAt: d,
                customerId: user.userId,
                createdBy: user.userId,
                subtotal: subtotal,
                taxAmount: taxAmount,
                salesRepId: user.userId
            });

            // Order Items (1 item for manual order just like main ERP)
            const itemId = `oi_${uuidv4().replace(/-/g, '')}`;
            db.prepare(`
                INSERT INTO order_items (
                    id, order_id, product_id, quantity, unit_price, tax_rate, tax_amount, total_price, status, company_id
                ) VALUES ($id, $orderId, $productId, $quantity, $unitPrice, $taxRate, $taxAmount, $totalPrice, 'pending', $companyId)
            `).run({
                id: itemId,
                orderId: orderId,
                productId: productId,
                quantity: quantity || 1,
                unitPrice: unit_price || 0,
                taxRate: taxRate,
                taxAmount: taxAmount,
                totalPrice: totalAmount,
                companyId: companyId
            });

            // Her zaman onaya düşürür
            const approvalId = `apr_${uuidv4().replace(/-/g, '')}`;
            db.prepare(`
                INSERT INTO order_approvals (id, order_id, requested_by, requested_at, status, order_amount, threshold_amount)
                VALUES ($id, $orderId, $requestedBy, $requestedAt, 'pending', $orderAmount, $thresholdAmount)
            `).run({
                id: approvalId,
                orderId: orderId,
                requestedBy: user.userId,
                requestedAt: d,
                orderAmount: totalAmount,
                thresholdAmount: threshold
            });

            // Bildirim oluştur (Yöneticiler için tek tek kayıt ekle)
            const adminUsers = db.prepare("SELECT id FROM users WHERE role IN ('admin', 'yonetici', 'planlama')").all() as { id: string }[];

            if (adminUsers.length > 0) {
                const insertNotification = db.prepare(`
                    INSERT INTO notifications (id, user_id, title, message, type, link, reference_type, reference_id)
                    VALUES ($id, $userId, $title, $message, 'warning', $link, 'order', $orderId)
                `);

                for (const admin of adminUsers) {
                    insertNotification.run({
                        id: uuidv4(),
                        userId: admin.id,
                        title: 'Bayi Siparişi Onay Bekliyor',
                        message: `${dealerName} tarafından oluşturulan ${finalOrderNumber} nolu sipariş onay bekliyor.`,
                        link: '/admin/approvals',
                        orderId: orderId
                    });
                }
            }

            // Bayi'ye de siparişin ulaştığına dair bildirim gönder
            db.prepare(`
                INSERT INTO notifications (id, user_id, title, message, type, link, reference_type, reference_id)
                VALUES ($id, $userId, $title, $message, 'info', $link, 'order', $orderId)
            `).run({
                id: uuidv4(),
                userId: user.userId,
                title: 'Siparişiniz Alındı',
                message: `${finalOrderNumber} nolu siparişiniz başarıyla oluşturuldu ve onaya sunuldu.`,
                link: '/bayi/orders',
                orderId: orderId
            });
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

        // Notify of failure (if we have the dealer name)
        try {
            const db = getDatabase();
            const userInfo = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(user.userId) as { dealer_name: string | null } | undefined;
            const dealerName = userInfo?.dealer_name || user.userId || 'Bayi';
            sendOrderFailureNotification({
                dealer_name: dealerName,
                error: error.message,
                product_name: body?.product_name || 'Bilinmeyen Ürün'
            }).catch(() => { });
        } catch (e) { }

        return fail('Sipariş oluşturulurken bir sistem hatası oluştu: ' + error.message);
    }
});
