import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Mevcut kullanıcı bilgileri
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.headers.get('x-auth-token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token gerekli' },
        { status: 401 }
      )
    }

    // Basit token kontrolü (gerçek uygulamada JWT decode edilmeli)
    // Şimdilik token'ı user_id olarak kullanıyoruz
    const db = getDatabase()
    
    // Token'dan user_id'yi al (basit implementasyon)
    // Gerçek uygulamada JWT decode edilmeli
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Geçersiz token' },
        { status: 401 }
      )
    }

    const user = db.prepare(`
      SELECT id, username, email, full_name, role, job_title, is_approved
      FROM users
      WHERE id = ? AND is_approved = 1
    `).get(userId) as any

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı veya onaylanmamış' },
        { status: 401 }
      )
    }

    // İzinleri getir
    const permissions = db.prepare(`
      SELECT page_path, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ?
    `).all(userId)

    return NextResponse.json({
      user: {
        ...user,
        permissions,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


