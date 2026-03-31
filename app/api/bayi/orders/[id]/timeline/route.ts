import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

export const GET = withAuth(async (request: NextRequest, user: AuthUser, context?: { params: Promise<{ id: string }> | { id: string } }) => {
    try {
        const resolvedParams = await Promise.resolve(context?.params);
        const orderId = resolvedParams?.id;
        if (!orderId) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
        const db = getDatabase();

        // Bayinin dealer_name bilgisini al
        const userInfo = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(user.userId) as { dealer_name: string | null } | undefined;
        const dealerName = userInfo?.dealer_name || '';

        // 1. Siparişi veritabanından bul (Ve yetki kontrolü yap: sadece bayiye ait sipariş)
        const order = db.prepare(`
            SELECT 
                id, status, created_at, order_number, dealer_name, customer_name, quantity, order_date, configuration, notes, product_name as direct_product_name, cancel_reason,
                (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count,
                (SELECT p.name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = orders.id LIMIT 1) as first_product_name
            FROM orders 
            WHERE id = ? AND company_id = ? 
            AND (customer_id = ? OR (customer_id IS NULL AND dealer_name = ?))
        `).get(orderId, 'company_default', user.userId, dealerName) as any;

        if (!order) {
            return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
        }

        // 2. Üretim emri var mı kontrol et
        const prodItems = db.prepare(`
            SELECT po.status as prod_status, po.created_at as prod_created, po.current_station as station_name
            FROM order_items oi
            LEFT JOIN production_orders po ON po.order_number = ? AND po.product_id = oi.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.created_at ASC LIMIT 1
        `).get(order.order_number, orderId) as any;

        const timeline = [];
        const baseDate = new Date(order.created_at);

        // Adım 1: Sipariş Alındı
        timeline.push({
            id: 'step1',
            title: 'Sipariş Onaylandı',
            description: 'Siparişiniz sisteme işlendi ve işleme alındı.',
            date: baseDate.toISOString(),
            status: 'completed',
            icon: 'CheckCircle'
        });

        // Adım 2: Üretime Hazırlık (Planlama)
        let step2Status = 'pending';
        let step2Date = null;
        if (order.status === 'processing' || order.status === 'completed' || prodItems?.prod_status) {
            step2Status = 'completed';
            step2Date = new Date(baseDate.getTime() + 1000 * 60 * 60 * 2).toISOString(); // 2 saat sonra
            timeline.push({
                id: 'step2',
                title: 'Üretime Hazırlık',
                description: 'Malzeme ihtiyaç planlaması (MRP) tamamlandı.',
                date: step2Date,
                status: 'completed',
                icon: 'Settings'
            });
        } else {
            timeline.push({
                id: 'step2',
                title: 'Üretime Hazırlık',
                description: 'Malzeme ihtiyaç planlaması (MRP) bekleniyor.',
                date: null,
                status: 'pending',
                icon: 'Settings'
            });
        }

        // Adım 3: Üretim Aşamaları (İskelet/Döşeme vb.)
        if (step2Status === 'completed') {
            const isProdActive = prodItems?.prod_status === 'in_progress';
            const isProdDone = prodItems?.prod_status === 'completed' || order.status === 'completed';
            const prodDate = prodItems?.prod_created ? new Date(prodItems.prod_created).toISOString() : new Date(baseDate.getTime() + 1000 * 60 * 60 * 24).toISOString();

            timeline.push({
                id: 'step3',
                title: 'Üretim Bandında',
                description: isProdDone ? 'Bütün üretim işlemleri tamamlandı.' :
                    isProdActive ? `Şu an ${prodItems.station_name || 'bantta'} işlem görüyor.` : 'Sıraya alındı.',
                date: isProdDone ? new Date(baseDate.getTime() + 1000 * 60 * 60 * 48).toISOString() : (isProdActive ? prodDate : null),
                status: isProdDone ? 'completed' : (isProdActive ? 'active' : 'pending'),
                icon: 'Hammer'
            });
        } else {
            timeline.push({
                id: 'step3',
                title: 'Üretim Bandında',
                description: 'Henüz üretime sevk edilmedi.',
                date: null,
                status: 'pending',
                icon: 'Hammer'
            });
        }

        // Adım 4: Kalite Kontrol & Paketleme
        const isDone = order.status === 'completed';
        timeline.push({
            id: 'step4',
            title: 'Kalite Kontrol ve Paketleme',
            description: isDone ? 'Ürünler paketlendi ve sevke hazır.' : 'Üretim sonrası kalite kontrolden geçecek.',
            date: isDone ? new Date(baseDate.getTime() + 1000 * 60 * 60 * 50).toISOString() : null,
            status: isDone ? 'completed' : 'pending',
            icon: 'Package'
        });

        // Adım 5: Sevkiyat
        timeline.push({
            id: 'step5',
            title: 'Sevkiyat ve Teslimat',
            description: isDone ? 'Ürünler kargolama/sevkiyat alanında bekliyor.' : 'Hazırlık sürecinin bitmesi bekleniyor.',
            date: null,
            status: 'pending',
            icon: 'Truck'
        });

        const productName = order.item_count > 1
            ? `${order.first_product_name || 'Ürün'} (+${order.item_count - 1} ürün daha)`
            : (order.direct_product_name ? String(order.direct_product_name).trim() || '—' : (order.first_product_name ? String(order.first_product_name).trim() || '—' : '—'));

        // Parse combined notes
        const notesStr = order.notes || '';
        const noteParts = notesStr.split(' | ').reduce((acc: any, part: string) => {
            const [key, ...valueParts] = part.split(': ');
            if (valueParts.length > 0) {
                acc[key.trim().toLowerCase()] = valueParts.join(': ').trim();
            } else {
                acc['other'] = (acc['other'] ? acc['other'] + ' | ' : '') + part;
            }
            return acc;
        }, {} as any);

        const orderDetails = {
            order_number: order.order_number,
            dealer_name: order.dealer_name,
            customer_name: order.customer_name,
            product_name: productName,
            quantity: order.quantity,
            order_date: order.order_date || order.created_at,
            status: order.status,
            cancel_reason: order.cancel_reason || null,
            configuration: order.configuration,
            kumas: noteParts['kumaş'] || '-',
            kasa: noteParts['kasa'] || '-',
            ayak: noteParts['ayak'] || '-',
            kirlent: noteParts['kirlent'] || '-',
            birim: noteParts['birim'] || '-',
            aciklama: noteParts['other'] || '-',
        };

        return NextResponse.json({ success: true, timeline, order_details: orderDetails, order_number: order.order_number, status: order.status, product_name: productName });
    } catch (error: any) {
        console.error('Error fetching timeline:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
