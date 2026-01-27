import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Tüm cari hesapları listele
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'customer' veya 'supplier'
    
    let query = `
      SELECT 
        a.*,
        creator.full_name as created_by_name,
        creator.username as created_by_username,
        updater.full_name as updated_by_name,
        updater.username as updated_by_username
      FROM accounts a
      LEFT JOIN users creator ON a.created_by = creator.id
      LEFT JOIN users updater ON a.updated_by = updater.id
    `
    const params: any[] = []
    
    if (type) {
      query += ' WHERE a.type = ?'
      params.push(type)
    }
    
    query += ' ORDER BY a.code ASC'
    
    const accounts = db.prepare(query).all(...params)
    
    return NextResponse.json(accounts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni cari hesap oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type = 'customer', tax_number, phone, email, address, created_by } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Müşteri/Tedarikçi adı gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // Kod oluştur
    const lastAccount = db.prepare(`
      SELECT code FROM accounts 
      WHERE type = ? 
      ORDER BY code DESC 
      LIMIT 1
    `).get(type) as any
    
    let codeNumber = 1
    if (lastAccount) {
      const lastNum = parseInt(lastAccount.code.replace(/[^0-9]/g, '')) || 0
      codeNumber = lastNum + 1
    }
    
    const prefix = type === 'customer' ? 'MUS' : 'TED'
    const code = `${prefix}-${String(codeNumber).padStart(4, '0')}`
    
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    db.prepare(`
      INSERT INTO accounts (id, code, name, type, tax_number, phone, email, address, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      code, 
      name, 
      type, 
      tax_number || null, 
      phone || null, 
      email || null, 
      address || null,
      created_by || null,
      created_by || null // İlk oluşturmada updated_by = created_by
    )

    return NextResponse.json({
      success: true,
      id,
      code,
      message: 'Cari hesap oluşturuldu'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


