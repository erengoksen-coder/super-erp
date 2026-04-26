import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'

export const GET = withAuth(async () => {
    try {
        const db = getDatabase()

        // Tüm kullanıcılar (aktif)
        const users = db.prepare(`
      SELECT id, username, full_name, role, email
      FROM users
      WHERE deleted_at IS NULL AND company_id = ?
      ORDER BY full_name
    `).all(DEFAULT_COMPANY_ID) as any[]

        // Tüm roller
        const roles = db.prepare(`
      SELECT DISTINCT role FROM users WHERE deleted_at IS NULL AND company_id = ?
    `).all(DEFAULT_COMPANY_ID) as any[]

        // Kullanıcı yetkileri
        const permissions = db.prepare(`
      SELECT user_id, page_path, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE company_id = ? AND branch_id = ?
    `).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any[]

        // Sayfa listesi
        const pages = [
            '/',
            '/orders', '/sales-orders', '/quotations', '/invoices', '/returns',
            '/shipments', '/waybills', '/accounts', '/customer-groups',
            '/inventory', '/inventory/materials', '/inventory/products', '/warehouses', '/stock-transfers', '/barcodes',
            '/production', '/production/calendar', '/production/work-orders', '/production/operations', '/production/work-centers', '/production/mrp', '/bom',
            '/quality-control', '/bakim',
            '/purchase-requests', '/purchase-orders', '/procurement', '/purchase/critical-stock',
            '/finance', '/accounting', '/checks-notes', '/payments', '/contracts', '/fixed-assets',
            '/reports', '/reports/costs', '/reports/fire',
            '/hr', '/mobile/material-stock', '/mobile/workstation', '/api-catalog', '/notifications', '/settings', '/users', '/admin'
        ]

        return ok({ users, roles: roles.map((r: any) => r.role), permissions, pages })
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})

export const POST = withAuth(async (request) => {
    try {
        const db = getDatabase()
        const { userId, pagePath, canView, canCreate, canEdit, canDelete, role } = await request.json()

        if (!userId || !pagePath) return fail('Kullanıcı ve sayfa gerekli', { status: 400 })

        // 1. Role güncellemesi (gelmişse)
        if (role) {
            db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, userId)
        }

        // 2. Permission Upsert
        const existing = db.prepare(
            'SELECT id FROM user_permissions WHERE user_id = ? AND page_path = ? AND company_id = ? AND branch_id = ?'
        ).get(userId, pagePath, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any

        if (existing) {
            db.prepare(`
        UPDATE user_permissions SET can_view = ?, can_create = ?, can_edit = ?, can_delete = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(canView ? 1 : 0, canCreate ? 1 : 0, canEdit ? 1 : 0, canDelete ? 1 : 0, existing.id)
        } else {
            const { randomUUID } = require('crypto')
            db.prepare(`
        INSERT INTO user_permissions (id, user_id, page_path, can_view, can_create, can_edit, can_delete, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), userId, pagePath, canView ? 1 : 0, canCreate ? 1 : 0, canEdit ? 1 : 0, canDelete ? 1 : 0, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
        }

        return ok({ message: 'Yetki güncellendi' })
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})
