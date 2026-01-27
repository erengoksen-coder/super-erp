import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { createHash } from 'crypto'
import { randomUUID } from 'crypto'

// GET: Tek kullanıcı detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const db = getDatabase()

    const user = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.position,
        u.job_title,
        u.is_approved,
        u.approved_by,
        u.approved_at,
        u.created_at,
        u.last_login,
        a.full_name as approved_by_name
      FROM users u
      LEFT JOIN users a ON u.approved_by = a.id
      WHERE u.id = ?
    `).get(userId) as any

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // İzinleri getir
    const permissions = db.prepare(`
      SELECT id, page_path, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ?
    `).all(userId)

    return NextResponse.json({
      ...user,
      permissions,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Kullanıcı güncelle (onaylama, izin güncelleme)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const body = await request.json()
    const { is_approved, approved_by, permissions, password, full_name, job_title, role, position, email } = body

    const db = getDatabase()

    // Kullanıcıyı bul
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    db.transaction(() => {
      // Kullanıcı bilgilerini güncelle
      if (is_approved !== undefined || approved_by || full_name !== undefined || job_title !== undefined || role !== undefined || position !== undefined || email !== undefined) {
        let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP'
        const updateParams: any[] = []

        if (is_approved !== undefined) {
          updateQuery += ', is_approved = ?'
          updateParams.push(is_approved ? 1 : 0)
          if (is_approved && approved_by) {
            updateQuery += ', approved_by = ?, approved_at = CURRENT_TIMESTAMP'
            updateParams.push(approved_by)
          }
        }

        if (email !== undefined) {
          updateQuery += ', email = ?'
          updateParams.push(email || null)
        }

        if (full_name !== undefined) {
          updateQuery += ', full_name = ?'
          updateParams.push(full_name)
        }

        if (job_title !== undefined) {
          updateQuery += ', job_title = ?'
          updateParams.push(job_title)
        }

        if (role !== undefined) {
          updateQuery += ', role = ?'
          updateParams.push(role)
        }

        if (position !== undefined) {
          updateQuery += ', position = ?'
          updateParams.push(position || null)
        }

        if (password) {
          const passwordHash = createHash('sha256').update(password).digest('hex')
          updateQuery += ', password_hash = ?'
          updateParams.push(passwordHash)
        }

        updateQuery += ' WHERE id = ?'
        updateParams.push(userId)

        db.prepare(updateQuery).run(...updateParams)
      }

      // İzinleri güncelle
      if (permissions && Array.isArray(permissions)) {
        // Mevcut izinleri sil
        db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId)

        // Yeni izinleri ekle
        for (const perm of permissions) {
          if (perm.page_path) {
            const permId = randomUUID()
            db.prepare(`
              INSERT INTO user_permissions (id, user_id, page_path, can_view, can_create, can_edit, can_delete)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              permId,
              userId,
              perm.page_path,
              perm.can_view ? 1 : 0,
              perm.can_create ? 1 : 0,
              perm.can_edit ? 1 : 0,
              perm.can_delete ? 1 : 0
            )
          }
        }
      }
    })()

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Kullanıcı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const db = getDatabase()

    // Admin kullanıcıyı silme
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as any
    if (user && user.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin kullanıcı silinemez' },
        { status: 400 }
      )
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId)

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
