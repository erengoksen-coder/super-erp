import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';
import { v4 as uuidv4 } from 'uuid';
import { sendTicketNotificationToChannels } from '@/lib/messaging/order-notification';

export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const db = getDatabase();

        // Bayiye ait cari kartı (Account) bulalım
        const userInfo = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(user.userId) as any;
        let customerId = user.userId;

        if (userInfo?.dealer_name) {
            const account = db.prepare('SELECT id FROM accounts WHERE name = ? COLLATE NOCASE').get(userInfo.dealer_name) as any;
            if (account) customerId = account.id;
        }

        const tickets = db.prepare(`
            SELECT t.*, COALESCE(p.name, t.custom_product_name, 'Bilinmeyen Ürün') as product_name
            FROM service_tickets t
            LEFT JOIN products p ON p.id = t.product_id
            WHERE t.customer_id = ? AND t.company_id = ?
            ORDER BY t.created_at DESC
        `).all(customerId, 'company_default');

        return NextResponse.json({ success: true, data: tickets });
    } catch (error: any) {
        console.error('[Bayi Tickets API] GET Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});

export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const body = await request.json();
        const { subject, description, priority, product_id, custom_product_name, image_url } = body;

        if (!subject || !description) {
            return NextResponse.json({ error: 'Konu ve açıklama zorunludur.' }, { status: 400 });
        }

        const db = getDatabase();

        // Bayiye ait cari kartı (Account) bulalım
        const userInfo = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(user.userId) as any;
        let customerId = user.userId;

        if (userInfo?.dealer_name) {
            const account = db.prepare('SELECT id FROM accounts WHERE name = ? COLLATE NOCASE').get(userInfo.dealer_name) as any;
            if (account) customerId = account.id;
        }

        const ticketId = `tck_${uuidv4().replace(/-/g, '')}`;
        const ticketNumber = `TKT-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        // Ticket kaydet
        db.prepare(`
            INSERT INTO service_tickets (
                id, ticket_number, customer_id, product_id, custom_product_name, subject, description, priority, image_url, company_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
        `).run(
            ticketId,
            ticketNumber,
            customerId,
            product_id || null,
            custom_product_name || null,
            subject,
            description,
            priority || 'medium',
            image_url || null,
            'company_default'
        );

        // Telegram bildirimi gönder
        const dealerName = userInfo?.dealer_name || 'Bilinmeyen Bayi';
        sendTicketNotificationToChannels({
            ticketNumber,
            subject,
            dealerName,
            priority: priority || 'medium'
        }).catch(e => console.error('Notification Error:', e));

        return NextResponse.json({
            success: true,
            data: { ticket_id: ticketId, ticket_number: ticketNumber },
            message: 'Destek talebiniz oluşturuldu.'
        });
    } catch (error: any) {
        console.error('[Bayi Tickets API] POST Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});
