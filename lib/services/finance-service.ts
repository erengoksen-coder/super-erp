import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { JournalEntryInput } from '@/lib/validation/finance-schema'

/**
 * Muhasebe ve Finans Servis Katmanı
 * Çift taraflı kayıt sistemi (Double Entry) mantığını yönetir.
 */
export const financeService = {
  
  /**
   * Yevmiye Fişlerini Listele
   */
  async getJournalEntries(companyId: string, branchId: string, startDate?: string, endDate?: string) {
    const db = getDatabase()
    let query = `
      SELECT je.*,
             (SELECT COUNT(*) FROM journal_entry_lines WHERE journal_entry_id = je.id) as line_count
      FROM journal_entries je
      WHERE je.company_id = ? AND je.branch_id = ? AND je.deleted_at IS NULL
    `
    const params: any[] = [companyId, branchId]

    if (startDate && endDate) {
      query += ' AND date(je.entry_date) >= date(?) AND date(je.entry_date) <= date(?)'
      params.push(startDate, endDate)
    }

    query += ' ORDER BY je.entry_date DESC, je.entry_number DESC'
    return db.prepare(query).all(...params)
  },

  /**
   * Yeni Yevmiye Fişi Oluştur (Atomik İşlem)
   */
  async createJournalEntry(companyId: string, branchId: string, input: JournalEntryInput) {
    const db = getDatabase()
    
    // Debit/Credit Toplamlarını Hesapla
    const totalDebit = input.lines.reduce((sum, line) => sum + (line.debit || 0), 0)
    const totalCredit = input.lines.reduce((sum, line) => sum + (line.credit || 0), 0)

    // Yevmiye Numarası Üret (Örn: YEV-20260328-0001)
    const today = new Date().toISOString().split('T')[0]
    const todayCountRes = db.prepare('SELECT COUNT(*) as count FROM journal_entries WHERE date(entry_date) = date(?)')
      .get(today) as { count: number }
    const entryNumber = `YEV-${today.replace(/-/g, '')}-${String((todayCountRes?.count || 0) + 1).padStart(4, '0')}`

    return db.transaction(() => {
      const entryId = randomUUID()
      
      // 1. Ana Fiş Kaydı
      db.prepare(`
        INSERT INTO journal_entries (id, entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(entryId, entryNumber, input.entry_date, input.description, input.reference_type, input.reference_id || null, totalDebit, totalCredit, companyId, branchId)

      // 2. Satırlar ve Defter-i Kebir Akışı
      for (const line of input.lines) {
        const lineId = randomUUID()
        const account = db.prepare('SELECT id, account_type, balance FROM chart_of_accounts WHERE code = ? AND company_id = ?')
          .get(line.account_code, companyId) as any
        
        if (!account) throw new Error(`Hesap kodu bulunamadı: ${line.account_code}`)

        // Satır Kaydı
        db.prepare(`
          INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit, credit, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(lineId, entryId, account.id, line.debit, line.credit, line.description || input.description)

        // Bakiye Değişimi Hesapla (Asset/Expense: Debit+, Credit- | Diğerleri: Credit+, Debit-)
        let change = 0
        if (['asset', 'expense'].includes(account.account_type)) {
          change = line.debit - line.credit
        } else {
          change = line.credit - line.debit
        }
        const newBalance = account.balance + change

        // Defter-i Kebir (General Ledger)
        db.prepare(`
          INSERT INTO general_ledger (id, account_id, entry_date, journal_entry_id, journal_entry_line_id, debit, credit, balance, description, reference_type, reference_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), account.id, input.entry_date, entryId, lineId, line.debit, line.credit, newBalance, line.description || input.description, input.reference_type, input.reference_id || null)

        // Hesap Bakiyesi Güncelle
        db.prepare('UPDATE chart_of_accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newBalance, account.id)
      }

      return entryId
    })()
  },

  /**
   * Mizan Hesapla (Trial Balance)
   */
  async getTrialBalance(companyId: string, branchId: string, endDate: string) {
    const db = getDatabase()
    const accounts = db.prepare(`
      SELECT 
        a.code as accountCode,
        a.name as accountName,
        a.account_type as category,
        COALESCE(SUM(jel.debit), 0) as debitBalance,
        COALESCE(SUM(jel.credit), 0) as creditBalance
      FROM chart_of_accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.company_id = ? 
        AND (je.id IS NULL OR (je.branch_id = ? AND date(je.entry_date) <= date(?) AND je.deleted_at IS NULL))
      GROUP BY a.code, a.name, a.account_type
      ORDER BY a.code
    `).all(companyId, branchId, endDate) as any[]

    const totalDebits = accounts.reduce((sum, acc) => sum + acc.debitBalance, 0)
    const totalCredits = accounts.reduce((sum, acc) => sum + acc.creditBalance, 0)

    return {
      endDate,
      accounts,
      totalDebits,
      totalCredits
    }
  },

  /**
   * Gelir Tablosu (Income Statement)
   */
  async getIncomeStatement(companyId: string, branchId: string, startDate: string, endDate: string) {
    const db = getDatabase()
    
    const activities = db.prepare(`
      SELECT 
        a.code,
        SUM(jel.credit - jel.debit) as net
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts a ON jel.account_id = a.id
      WHERE je.company_id = ? AND je.branch_id = ? 
        AND date(je.entry_date) BETWEEN date(?) AND date(?) 
        AND je.deleted_at IS NULL
        AND a.code LIKE '6%'
      GROUP BY a.code
    `).all(companyId, branchId, startDate, endDate) as any[]

    const getBalance = (prefix: string) => 
      activities.filter(a => a.code.startsWith(prefix)).reduce((s, a) => s + a.net, 0)

    const salesRevenue = getBalance('600')
    const costOfGoodsSold = Math.abs(getBalance('62'))
    const operatingExpenses = Math.abs(getBalance('63'))
    
    const totalRevenue = salesRevenue
    const grossProfit = totalRevenue - costOfGoodsSold
    const operatingIncome = grossProfit - operatingExpenses
    const netIncome = operatingIncome

    return {
      startDate,
      endDate,
      revenue: { salesRevenue, totalRevenue },
      expenses: { costOfGoodsSold, operatingExpenses, totalExpenses: costOfGoodsSold + operatingExpenses },
      profitability: {
        grossProfit,
        operatingIncome,
        netIncome,
        grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        netMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
      }
    }
  },

  /**
   * Bilanço (Balance Sheet)
   */
  async getBalanceSheet(companyId: string, branchId: string, endDate: string) {
    const db = getDatabase()
    
    const balances = db.prepare(`
      SELECT 
        SUBSTR(a.code, 1, 1) as main_group,
        a.account_type,
        SUM(jel.debit - jel.credit) as balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts a ON jel.account_id = a.id
      WHERE je.company_id = ? AND je.branch_id = ? 
        AND date(je.entry_date) <= date(?) 
        AND je.deleted_at IS NULL
      GROUP BY main_group, a.account_type
    `).all(companyId, branchId, endDate) as any[]

    const getGroupBalance = (group: string) => 
      balances.filter(b => b.main_group === group).reduce((s, b) => s + b.balance, 0)

    const currentAssets = getGroupBalance('1')
    const fixedAssets = getGroupBalance('2')
    const liabilities = Math.abs(getGroupBalance('3') + getGroupBalance('4'))
    const equity = Math.abs(getGroupBalance('5'))

    return {
      endDate,
      assets: { currentAssets, fixedAssets, totalAssets: currentAssets + fixedAssets },
      liabilities: { totalLiabilities: liabilities },
      equity: { totalEquity: equity }
    }
  }
}
