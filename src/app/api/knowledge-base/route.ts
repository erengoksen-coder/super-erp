import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { getDatabase } from '@/lib/database/db';
import { ok, fail } from '@/lib/api/response';
import { randomUUID } from 'crypto';

/**
 * Super ERP - Knowledge Base Management API
 * Provides CRUD operations for the AI knowledge base.
 */

// GET: Tüm bilgi bankası kayıtlarını listele
export const GET = withAuth(async (_request: NextRequest, authUser) => {
    try {
        const db = getDatabase();
        const rows = db.prepare(`
            SELECT id, category, title, keywords, answer, updated_at
            FROM knowledge_base
            WHERE company_id = ?
            ORDER BY category, title
        `).all(authUser.companyId);

        const data = rows.map((r: any) => ({
            ...r,
            keywords: r.keywords ? JSON.parse(r.keywords) : []
        }));

        return ok(data);
    } catch (error: any) {
        return fail(error.message, { status: 500 });
    }
}, ['admin']);

// POST: Yeni bilgi ekle
export const POST = withAuth(async (request: NextRequest, authUser) => {
    try {
        const body = await request.json();
        const { category, title, keywords, answer } = body;

        if (!category || !title || !answer) {
            return fail('Kategori, başlık ve cevap gerekli.', { status: 400 });
        }

        const db = getDatabase();
        const id = `kb_${randomUUID()}`;

        db.prepare(`
            INSERT INTO knowledge_base (id, category, title, keywords, answer, company_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            id,
            category,
            title,
            JSON.stringify(keywords || []),
            answer,
            authUser.companyId
        );

        return ok({ id }, { message: 'Bilgi bankasına başarıyla eklendi.' });
    } catch (error: any) {
        return fail(error.message, { status: 500 });
    }
}, ['admin']);
