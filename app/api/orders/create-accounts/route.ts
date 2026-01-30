import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// Bayi isminden otomatik cari hesap oluştur (eğer yoksa)
function createAccountIfNotExists(db: any, dealerName: string | null): { created: boolean, accountId: string | null } {
  if (!dealerName || dealerName.trim() === '') {
    return { created: false, accountId: null }
  }

  const trimmedName = dealerName.trim()
  
  // Aynı isimde cari hesap var mı kontrol et
  const existingAccount = db.prepare('SELECT id FROM accounts WHERE name = ? COLLATE NOCASE').get(trimmedName) as any
  
  if (existingAccount) {
    // Zaten var, oluşturma
    return { created: false, accountId: existingAccount.id }
  }

  try {
    // Kod oluştur
    const lastAccount = db.prepare(`
      SELECT code FROM accounts 
      WHERE type = 'customer' 
      ORDER BY code DESC 
      LIMIT 1
    `).get() as any
    
    let codeNumber = 1
    if (lastAccount) {
      const lastNum = parseInt(lastAccount.code.replace(/[^0-9]/g, '')) || 0
      codeNumber = lastNum + 1
    }
    
    const code = `MUS-${String(codeNumber).padStart(4, '0')}`
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Cari hesap oluştur (created_by ve updated_by NULL, FOREIGN KEY constraint için)
    db.prepare(`
      INSERT INTO accounts (id, code, name, type, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, code, trimmedName, 'customer', null, null)
    
    return { created: true, accountId: id }
  } catch (error: any) {
    console.warn(`Cari hesap oluşturulamadı (${trimmedName}):`, error.message)
    return { created: false, accountId: null }
  }
}

// POST: Mevcut siparişlerden cari hesaplar oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    
    // Tüm siparişlerden benzersiz bayi isimlerini al
    const orders = db.prepare(`
      SELECT DISTINCT dealer_name 
      FROM active_orders 
      WHERE dealer_name IS NOT NULL AND dealer_name != ''
      ORDER BY dealer_name
    `).all() as Array<{ dealer_name: string }>
    
    const results = {
      total_dealers: orders.length,
      created: 0,
      existing: 0,
      errors: 0,
      details: [] as Array<{ name: string, status: string }>
    }
    
    for (const order of orders) {
      const result = createAccountIfNotExists(db, order.dealer_name)
      if (result.created) {
        results.created++
        results.details.push({ name: order.dealer_name, status: 'Oluşturuldu' })
      } else if (result.accountId) {
        results.existing++
        results.details.push({ name: order.dealer_name, status: 'Zaten mevcut' })
      } else {
        results.errors++
        results.details.push({ name: order.dealer_name, status: 'Hata' })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${results.created} yeni cari hesap oluşturuldu, ${results.existing} cari hesap zaten mevcuttu`,
      ...results
    })
  } catch (error: any) {
    console.error('Cari hesaplar oluşturulurken hata:', error)
    return NextResponse.json({ 
      error: 'Cari hesaplar oluşturulamadı',
      details: error.message 
    }, { status: 500 })
  }
})
