import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';
        const type = searchParams.get('type') || 'inbox'; // 'inbox' (bekleyenler) veya 'sent' (benim gönderdiklerim)

        const db = getDatabase();

        // Kullanıcının rollerini al
        const userRoles = db.prepare(`
      SELECT role_id FROM user_roles WHERE user_id = ? AND company_id = ?
    `).all(user.userId, 'company_default') as Array<{ role_id: string }>;

        const roleIds = userRoles.map(r => r.role_id);
        // Eski admin/user sistemi için de manuel fallback ekle
        if (user.role && !roleIds.includes(`role_${user.role}`)) {
            roleIds.push(`role_${user.role}`);
        }

        let query = `
      SELECT 
        ar.*,
        r.full_name as requester_name,
        a.full_name as approver_name
      FROM approval_requests ar
      LEFT JOIN users r ON r.id = ar.requester_id
      LEFT JOIN users a ON a.id = ar.approver_id
      WHERE ar.deleted_at IS NULL
      AND ar.company_id = ?
    `;

        const params: any[] = ['company_default'];

        if (status !== 'all') {
            query += ` AND ar.status = ?`;
            params.push(status);
        }

        if (type === 'inbox') {
            // Benim onayımı bekleyenler (Rolüme düşenler)
            if (roleIds.length > 0) {
                const placeholders = roleIds.map(() => '?').join(',');
                query += ` AND ar.approver_role_id IN (${placeholders})`;
                params.push(...roleIds);
            } else {
                // Rolü yoksa bir şey göremez inbox'ta
                return NextResponse.json([]);
            }
        } else if (type === 'sent') {
            // Benim gönderdiğim talepler
            query += ` AND ar.requester_id = ?`;
            params.push(user.userId);
        }

        query += ` ORDER BY ar.created_at DESC`;

        const requests = db.prepare(query).all(...params);

        return NextResponse.json(requests);
    } catch (error: any) {
        console.error('Error fetching approval requests:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// Talebi Onayla veya Reddet
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const data = await request.json();
        const { request_id, action, notes, rejection_reason } = data; // action: 'approve' veya 'reject'

        if (!request_id || !action) {
            return NextResponse.json({ error: 'Eksik veri gönderildi.' }, { status: 400 });
        }

        const db = getDatabase();

        const approvalRequest = db.prepare(
            'SELECT * FROM approval_requests WHERE id = ? AND company_id = ?'
        ).get(request_id, 'company_default') as any;

        if (!approvalRequest) {
            return NextResponse.json({ error: 'Talep bulunamadı.' }, { status: 404 });
        }

        if (approvalRequest.status !== 'pending') {
            return NextResponse.json({ error: 'Bu talep zaten isleme alinmis.' }, { status: 400 });
        }

        const status = action === 'approve' ? 'approved' : 'rejected';

        db.prepare(`
      UPDATE approval_requests
      SET 
        status = ?, 
        approver_id = ?, 
        notes = ?,
        rejection_reason = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
            status,
            user.userId,
            notes || null,
            rejection_reason || null,
            request_id
        );

        // TODO: Burada asıl belge tipi (örn. Purchase Request) statüsünü de 'approved' veya 'rejected' yapacak bir hook (trigger) çağrılabilir.

        return NextResponse.json({ success: true, status });
    } catch (error: any) {
        console.error('Error processing approval:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});