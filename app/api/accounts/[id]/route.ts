import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Tek cari hesap detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(params)
    const accountId = resolvedParams.id

    const account = db.prepare(`
      SELECT 
        a.*,
        creator.full_name as created_by_name,
        creator.username as created_by_username,
        updater.full_name as updated_by_name,
        updater.username as updated_by_username
      FROM accounts a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users updater ON a.updated_by = updater.id
      WHERE a.id = ?
    `).get(accountId) as any

    if (!account) {
      return NextResponse.json({ error: 'Cari hesap bulunamadı' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: Cari hesap güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(params)
    const accountId = resolvedParams.id
    const body = await request.json()
    const { name, type, tax_number, phone, email, address, updated_by } = body

    // Cari hesabın var olup olmadığını kontrol et
    const existingAccount = db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId) as any
    if (!existingAccount) {
      return NextResponse.json({ error: 'Cari hesap bulunamadı' }, { status: 404 })
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Müşteri/Tedarikçi adı gerekli' },
        { status: 400 }
      )
    }

    // Güncelle
    db.prepare(`
      UPDATE accounts 
      SET name = ?, type = ?, tax_number = ?, phone = ?, email = ?, address = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      type || existingAccount.type,
      tax_number || null,
      phone || null,
      email || null,
      address || null,
      updated_by || null,
      accountId
    )

    return NextResponse.json({
      success: true,
      message: 'Cari hesap güncellendi'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Cari hesap sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(params)
    const accountId = resolvedParams.id

    // Cari hesabın var olup olmadığını kontrol et
    const existingAccount = db.prepare('SELECT id, name FROM accounts WHERE id = ?').get(accountId) as any
    if (!existingAccount) {
      return NextResponse.json({ error: 'Cari hesap bulunamadı' }, { status: 404 })
    }

    // Cari hesabın kullanılıp kullanılmadığını kontrol et (materials, orders, vb.)
    const usedInMaterials = db.prepare('SELECT COUNT(*) as count FROM materials WHERE supplier_id = ?').get(accountId) as any
    const usedInOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE customer_code = ? OR dealer_name = ?').get(accountId, existingAccount.name) as any
    
    if (usedInMaterials?.count > 0 || usedInOrders?.count > 0) {
      return NextResponse.json(
        { error: 'Bu cari hesap kullanılıyor, silinemez' },
        { status: 400 }
      )
    }

    // Sil
    db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId)

    return NextResponse.json({
      success: true,
      message: 'Cari hesap silindi'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

