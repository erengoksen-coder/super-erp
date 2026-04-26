import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';
import { sendTelegramMessage } from '@/lib/messaging/telegram';

const CANCELLED_BY_DEALER = 'bayi_tarafindan_iptal';

// Bayinin kendi siparişini iptal etmesi/silmesi
export const DELETE = withAuth(async (request: NextRequest, { userId }: AuthUser, props: any) => {
    try {
        const { id: orderId } = await props.params;
        const db = getDatabase();

        // Siparişi kontrol et: sadece kendisine ait ve iptal edilebilir durumdaysa
        // İptal edilebilir durumlar: pending, approval_pending (Üretim başlamadan önce)
        const order = db.prepare(`
            SELECT o.id, o.status, o.customer_id, o.order_number, o.dealer_name,
                   (SELECT p.name FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id LIMIT 1) as first_product_name
            FROM orders o WHERE o.id = ?
        `).get(orderId) as any;

        if (!order) {
            return NextResponse.json({ error: 'Sipariş bulunamadı.' }, { status: 404 });
        }

        // Yetki kontrolü (kendi siparişi mi?)
        if (order.customer_id !== userId) {
            return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 });
        }

        const deletableStatuses = ['pending', 'approval_pending'];
        if (!deletableStatuses.includes(order.status)) {
            return NextResponse.json({
                error: 'Bu sipariş iptal edilemez. Üretime alınmış veya ilerlemiş siparişler iptal edilemez.'
            }, { status: 400 });
        }

        // İptal: status + cancel_reason (deleted_at set etmiyoruz; sipariş listede "Bayi tarafından iptal edilmiştir" olarak kalsın)
        db.prepare(`
            UPDATE orders SET status = 'cancelled', cancel_reason = ? WHERE id = ?
        `).run(CANCELLED_BY_DEALER, orderId);

        // Varsa onay kaydını da iptal et
        try {
            db.prepare('UPDATE order_approvals SET status = \'cancelled\' WHERE order_id = ?').run(orderId);
        } catch { }

        // Telegram bildirimi (bayi sipariş iptali)
        try {
            const userRow = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(userId) as { dealer_name: string | null } | undefined;
            const dealerName = userRow?.dealer_name || order.dealer_name || 'Bayi';
            const { getSetting } = await import('@/lib/database/db');
            const botToken = getSetting(db, 'telegram_bot_token');
            const chatId = getSetting(db, 'telegram_chat_id');
            if (botToken && chatId) {
                sendTelegramMessage(botToken, chatId,
                    `🚫 Sipariş İptal (Bayi)\nBayi: ${dealerName}\nSipariş: ${order.order_number || orderId}`
                ).catch(err => console.error('Telegram order cancelled:', err));
            }
        } catch { }

        return NextResponse.json({ success: true, message: 'Sipariş başarıyla iptal edildi.' });

    } catch (error: any) {
        console.error('Order cancellation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
