/**
 * Muhasebe ve Finans İşlemleri
 * Logo tarzı çift taraflı kayıt sistemi
 */

import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

interface JournalEntryLine {
  account_code: string
  debit: number
  credit: number
  description?: string
}

interface JournalEntry {
  entry_date: string
  description: string
  reference_type: string
  reference_id?: string
  lines: JournalEntryLine[]
}

/**
 * Yevmiye kaydı oluştur (Çift Taraflı Kayıt)
 */
export async function createJournalEntry(entry: JournalEntry): Promise<string> {
  const db = getDatabase()

  // Debit ve Credit toplamlarını kontrol et
  const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
  const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Yevmiye kaydı dengeli değil! Debit: ${totalDebit}, Credit: ${totalCredit}`)
  }

  // Yevmiye numarası oluştur
  const today = new Date().toISOString().split('T')[0]
  const todayCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM journal_entries 
    WHERE date(entry_date) = date(?)
  `).get(today) as any

  const entryNumber = `YEV-${today.replace(/-/g, '')}-${String((todayCount?.count || 0) + 1).padStart(4, '0')}`

  return db.transaction(() => {
    // 1. Yevmiye kaydını oluştur
    const journalEntryId = randomUUID()
    db.prepare(`
      INSERT INTO journal_entries 
      (id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      journalEntryId,
      entryNumber,
      entry.entry_date,
      entry.description,
      entry.reference_type,
      entry.reference_id || null,
      totalDebit,
      totalCredit
    )

    // 2. Yevmiye satırlarını oluştur
    const insertLine = db.prepare(`
      INSERT INTO journal_entry_lines 
      (id, journal_entry_id, account_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    // 3. Defter-i Kebir kayıtlarını oluştur
    const insertLedger = db.prepare(`
      INSERT INTO general_ledger 
      (id, account_id, entry_date, journal_entry_id, journal_entry_line_id, debit, credit, balance, description, reference_type, reference_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const updateAccountBalance = db.prepare(`
      UPDATE chart_of_accounts
      SET balance = balance + ? - ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    const updateDealerBalance = db.prepare(`
      UPDATE accounts
      SET balance = balance + ? - ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE code = ?
    `)

    for (const line of entry.lines) {
      // 1. Hesap bul veya oluştur
      let account = db.prepare('SELECT id, account_type, balance, code FROM chart_of_accounts WHERE code = ?').get(line.account_code) as any

      if (!account) {
        // Eğer hesap planında yoksa, 'accounts' tablosunda var mı bak
        const dealer = db.prepare('SELECT name, type FROM accounts WHERE code = ?').get(line.account_code) as any
        if (dealer) {
          // Otomatik olarak hesap planına ekle
          const parentCode = dealer.type === 'supplier' ? '320' : '120'
          const parent = db.prepare('SELECT id, account_type FROM chart_of_accounts WHERE code = ?').get(parentCode) as any

          if (!parent) {
            // Parent da yoksa (çok düşük ihtimal ama güvenli olalım)
            throw new Error(`Ana hesap bulunamadı: ${parentCode}`)
          }

          const newAccountId = randomUUID()
          db.prepare(`
            INSERT INTO chart_of_accounts (id, code, name, account_type, parent_id, balance)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(newAccountId, line.account_code, dealer.name, parent.account_type, parent.id, 0)

          account = { id: newAccountId, account_type: parent.account_type, balance: 0, code: line.account_code }
        } else {
          throw new Error(`Hesap bulunamadı: ${line.account_code}`)
        }
      }

      const lineId = randomUUID()
      insertLine.run(
        lineId,
        journalEntryId,
        account.id,
        line.debit || 0,
        line.credit || 0,
        line.description || entry.description
      )

      // 2. Bakiyeleri güncelle
      let balanceChange = 0
      if (account.account_type === 'asset' || account.account_type === 'expense') {
        balanceChange = (line.debit || 0) - (line.credit || 0)
      } else {
        balanceChange = (line.credit || 0) - (line.debit || 0)
      }

      const newBalance = (account.balance || 0) + balanceChange

      // Defter-i Kebir kaydı
      const ledgerId = randomUUID()
      insertLedger.run(
        ledgerId,
        account.id,
        entry.entry_date,
        journalEntryId,
        lineId,
        line.debit || 0,
        line.credit || 0,
        newBalance,
        line.description || entry.description,
        entry.reference_type,
        entry.reference_id || null
      )

      // Hesap planı bakiyesini güncelle
      updateAccountBalance.run(
        line.debit || 0,
        line.credit || 0,
        account.id
      )

      // Dealer (accounts tablosu) bakiyesini de güncelle
      updateDealerBalance.run(
        line.debit || 0,
        line.credit || 0,
        account.code
      )
    }

    return journalEntryId
  })()
}

/**
 * Satış işlemi için otomatik yevmiye kaydı
 */
export async function createSaleJournalEntry(
  saleId: string,
  customerId: string,
  amount: number,
  taxAmount: number = 0,
  costOfGoodsSold: number = 0,
  saleDate: string = new Date().toISOString().split('T')[0]
): Promise<string> {
  const db = getDatabase()

  // Müşteri hesabını bul
  const customer = db.prepare('SELECT code FROM accounts WHERE id = ?').get(customerId) as any
  if (!customer) {
    throw new Error('Müşteri bulunamadı')
  }

  const totalAmount = amount + taxAmount

  return createJournalEntry({
    entry_date: saleDate,
    description: `Satış: ${customer.code}`,
    reference_type: 'sale',
    reference_id: saleId,
    lines: [
      {
        account_code: customer.code, // Müşteri (120 - Alacaklar) -> BORÇ
        debit: totalAmount,
        credit: 0,
        description: 'Satış borcu'
      },
      {
        account_code: '600', // Gelir (Satış Geliri) -> ALACAK
        debit: 0,
        credit: amount,
        description: 'Satış geliri'
      },
      {
        account_code: '391', // Hesaplanan KDV -> ALACAK
        debit: 0,
        credit: taxAmount,
        description: 'Hesaplanan KDV'
      },
      {
        account_code: '620', // Satılan Malın Maliyeti -> BORÇ
        debit: costOfGoodsSold,
        credit: 0,
        description: 'Satılan malın maliyeti'
      },
      {
        account_code: '150', // Stok (Mamül) -> ALACAK
        debit: 0,
        credit: costOfGoodsSold,
        description: 'Stok çıkışı'
      }
    ]
  })
}

/**
 * Satın alma işlemi için otomatik yevmiye kaydı
 */
export async function createPurchaseJournalEntry(
  purchaseId: string,
  supplierId: string,
  amount: number,
  taxAmount: number = 0,
  purchaseDate: string = new Date().toISOString().split('T')[0]
): Promise<string> {
  const db = getDatabase()

  // Tedarikçi hesabını bul
  const supplier = db.prepare('SELECT code FROM accounts WHERE id = ?').get(supplierId) as any
  if (!supplier) {
    throw new Error('Tedarikçi bulunamadı')
  }

  const totalAmount = amount + taxAmount

  return createJournalEntry({
    entry_date: purchaseDate,
    description: `Satın Alma: ${supplier.code}`,
    reference_type: 'purchase',
    reference_id: purchaseId,
    lines: [
      {
        account_code: '150', // Stok (Hammadde) -> BORÇ
        debit: amount,
        credit: 0,
        description: 'Stok girişi'
      },
      {
        account_code: '191', // İndirilecek KDV -> BORÇ
        debit: taxAmount,
        credit: 0,
        description: 'İndirilecek KDV'
      },
      {
        account_code: supplier.code, // Tedarikçi (320 - Satıcılar) -> ALACAK
        debit: 0,
        credit: totalAmount,
        description: 'Satın alma borcu'
      }
    ]
  })
}

/**
 * Üretim işlemi için otomatik yevmiye kaydı
 */
export async function createProductionJournalEntry(
  productionOrderId: string,
  materialCost: number,
  laborCost: number,
  productionDate: string = new Date().toISOString().split('T')[0]
): Promise<string> {
  const totalCost = materialCost + laborCost

  return createJournalEntry({
    entry_date: productionDate,
    description: `Üretim: ${productionOrderId}`,
    reference_type: 'production',
    reference_id: productionOrderId,
    lines: [
      {
        account_code: '150', // Stok (Mamül)
        debit: totalCost,
        credit: 0,
        description: 'Üretilen mamül'
      },
      {
        account_code: '150', // Stok (Hammadde)
        debit: 0,
        credit: materialCost,
        description: 'Hammadde tüketimi'
      },
      {
        account_code: '720', // İşçilik Gideri
        debit: laborCost,
        credit: 0,
        description: 'Üretim işçiliği'
      }
    ]
  })
}

/**
 * Hesap planını başlat (Temel hesaplar)
 */
export function initializeChartOfAccounts() {
  const db = getDatabase()

  const accounts = [
    // Varlıklar (Assets)
    { code: '100', name: 'Dönen Varlıklar', account_type: 'asset', parent_id: null },
    { code: '150', name: 'Stoklar', account_type: 'asset', parent_id: '100' },
    { code: '120', name: 'Alacaklar', account_type: 'asset', parent_id: '100' },
    { code: '191', name: 'KDV', account_type: 'asset', parent_id: '100' },

    // Yükümlülükler (Liabilities)
    { code: '200', name: 'Kısa Vadeli Yükümlülükler', account_type: 'liability', parent_id: null },
    { code: '320', name: 'Satıcılar', account_type: 'liability', parent_id: '200' },

    // Özkaynaklar (Equity)
    { code: '500', name: 'Özkaynaklar', account_type: 'equity', parent_id: null },
    { code: '590', name: 'Dönem Net Karı', account_type: 'equity', parent_id: '500' },

    // Gelirler (Revenue)
    { code: '600', name: 'Satış Gelirleri', account_type: 'revenue', parent_id: null },

    // Giderler (Expenses)
    { code: '620', name: 'Satılan Malın Maliyeti', account_type: 'expense', parent_id: null },
    { code: '720', name: 'Üretim Giderleri', account_type: 'expense', parent_id: null },
    { code: '730', name: 'Genel Yönetim Giderleri', account_type: 'expense', parent_id: null },
  ]

  const insertAccount = db.prepare(`
    INSERT OR IGNORE INTO chart_of_accounts 
    (id, code, name, account_type, parent_id)
    VALUES (?, ?, ?, ?, ?)
  `)

  for (const account of accounts) {
    const parent = account.parent_id
      ? db.prepare('SELECT id FROM chart_of_accounts WHERE code = ?').get(account.parent_id) as any
      : null

    insertAccount.run(
      randomUUID(),
      account.code,
      account.name,
      account.account_type,
      parent?.id || null
    )
  }
}


