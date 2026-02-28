import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';
import { v4 as uuidv4 } from 'uuid';

export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const db = getDatabase();
        // JOIN with roles table to get approver_role name
        const rules = db.prepare(`
      SELECT 
        ar.*,
        r.name as approver_role_name,
        r.description as approver_role_description
      FROM approval_rules ar
      JOIN roles r ON r.id = ar.approver_role_id
      WHERE ar.deleted_at IS NULL
      AND ar.company_id = ?
      ORDER BY ar.document_type ASC, ar.min_amount ASC
    `).all('company_default');

        return NextResponse.json(rules);
    } catch (error: any) {
        console.error('Error fetching approval rules:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        // Yalnızca admin kural oluşturabilir
        if (!user.role || !user.role.toLowerCase().includes('admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await request.json();
        const { document_type, min_amount, max_amount, approver_role_id, is_active } = data;

        if (!document_type || !approver_role_id) {
            return NextResponse.json({ error: 'Eksik veri gönderildi.' }, { status: 400 });
        }

        const db = getDatabase();
        const id = `ar_${uuidv4().replace(/-/g, '')}`;

        db.prepare(`
      INSERT INTO approval_rules (
        id, document_type, min_amount, max_amount, approver_role_id, is_active, company_id, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            id,
            document_type,
            min_amount || 0,
            max_amount || null,
            approver_role_id,
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            'company_default',
            'branch_default'
        );

        const newRule = db.prepare('SELECT * FROM approval_rules WHERE id = ?').get(id);

        return NextResponse.json(newRule, { status: 201 });
    } catch (error: any) {
        console.error('Error creating approval rule:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        if (!user.role || !user.role.toLowerCase().includes('admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await request.json();
        const { id, document_type, min_amount, max_amount, approver_role_id, is_active } = data;

        if (!id) {
            return NextResponse.json({ error: 'Kural ID gerekli.' }, { status: 400 });
        }

        const db = getDatabase();

        db.prepare(`
      UPDATE approval_rules
      SET 
        document_type = ?, 
        min_amount = ?, 
        max_amount = ?, 
        approver_role_id = ?, 
        is_active = ?,
        updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `).run(
            document_type,
            min_amount,
            max_amount,
            approver_role_id,
            is_active !== undefined ? (is_active ? 1 : 0) : 1,
            id,
            'company_default'
        );

        const updated = db.prepare('SELECT * FROM approval_rules WHERE id = ?').get(id);
        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Error updating approval rule:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const DELETE = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        if (!user.role || !user.role.toLowerCase().includes('admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Kural ID gerekli.' }, { status: 400 });
        }

        const db = getDatabase();

        db.prepare(`
      UPDATE approval_rules 
      SET deleted_at = datetime('now'), is_active = 0 
      WHERE id = ? AND company_id = ?
    `).run(id, 'company_default');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting approval rule:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
