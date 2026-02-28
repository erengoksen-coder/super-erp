import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const db = getDatabase();
        const customerId = user.userId;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12

        // 1. Bayinin Yıllık/Aylık Hedefi
        const targetRow = db.prepare(`
            SELECT target_amount 
            FROM dealer_targets 
            WHERE customer_id = ? AND year = ? AND month = ?
        `).get(customerId, currentYear, currentMonth) as { target_amount: number };

        const monthTarget = targetRow?.target_amount || 0;

        // 2. Bayinin Bu Ayki Cirosu (Sipariş Toplamı - Sadece iptal olmayanlar)
        // start of month
        const firstDay = new Date(currentYear, currentMonth - 1, 1).toISOString();
        const lastDay = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

        const revenueRow = db.prepare(`
            SELECT SUM(total_amount) as current_revenue 
            FROM orders 
            WHERE customer_id = ? AND status != 'cancelled' 
            AND created_at >= ? AND created_at <= ?
        `).get(customerId, firstDay, lastDay) as { current_revenue: number };

        const currentRevenue = revenueRow?.current_revenue || 0;

        // Target progress calculation
        const progressPercent = monthTarget > 0 ? Math.min(Math.round((currentRevenue / monthTarget) * 100), 100) : 0;

        // 3. Açık Servis Talepleri Sayısı
        const ticketsRow = db.prepare(`
            SELECT COUNT(*) as active_tickets 
            FROM service_tickets 
            WHERE customer_id = ? AND status IN ('open', 'in_progress')
        `).get(customerId) as { active_tickets: number };

        const activeTicketsCount = ticketsRow?.active_tickets || 0;

        // 4. Sevk Bekleyen Siparişler
        const pendingOrdersRow = db.prepare(`
            SELECT COUNT(*) as pending_orders 
            FROM orders 
            WHERE customer_id = ? AND status IN ('pending', 'processing')
        `).get(customerId) as { pending_orders: number };

        const pendingOrdersCount = pendingOrdersRow?.pending_orders || 0;

        // 5. Duyurular
        const announcements = db.prepare(`
            SELECT * FROM announcements 
            WHERE target_audience IN ('all', 'dealers') AND (valid_until IS NULL OR valid_until >= ?)
            ORDER BY created_at DESC LIMIT 3
        `).all(now.toISOString()) as any[];

        return NextResponse.json({
            success: true,
            data: {
                performance: {
                    monthTarget,
                    currentRevenue,
                    progressPercent,
                    month: currentMonth,
                    year: currentYear
                },
                stats: {
                    activeTickets: activeTicketsCount,
                    pendingOrders: pendingOrdersCount
                },
                announcements
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
