import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { ok, fail } from '@/lib/api/response';
import { handleApi } from '@/lib/api/handler';
import { getDatabase } from '@/lib/database/db';
import { logInfo, logError } from '@/lib/logger';

/**
 * Livasofa ERP Unified Settings API
 * Manages company-wide parameters like VKN, Brand, and UI Config.
 */

export const GET = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT key, value, category FROM settings WHERE company_id = ?').all(authUser.companyId);
    
    // Convert to a cleaner object { [key]: value }
    const settings: any = {};
    rows.forEach((row: any) => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch (e) {
        settings[row.key] = row.value;
      }
    });
    
    return ok(settings);
  });
});

export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const body = await request.json();
    const { key, value, category = 'general' } = body;
    
    if (!key) return fail('Ayar anahtarı (key) zorunludur', { status: 400 });

    const db = getDatabase();
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    db.prepare(`
      INSERT INTO settings (key, value, category, company_id, branch_id, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value, 
        updated_at = CURRENT_TIMESTAMP,
        updated_by = excluded.updated_by
    `).run(key, valueStr, category, authUser.companyId, authUser.branchId, authUser.userId);

    logInfo('Sistem ayarı güncellendi', { key });
    return ok(null, { message: 'Ayar başarıyla kaydedildi' });
  });
});
