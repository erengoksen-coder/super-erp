import { getDatabase } from '@/lib/database/db'
import { 
  BalanceSheet, 
  IncomeStatement, 
  TrialBalance
} from '@/lib/types/financial'
import { createError } from '@/lib/utils/errors'

export class FinancialReportingService {
  private getDb() {
    return getDatabase()
  }

  async getTrialBalance(companyId: string, branchId: string, endDate: string): Promise<TrialBalance> {
    try {
      const db = this.getDb()
      const accounts = db.prepare(`
        SELECT 
          a.code as accountCode,
          a.name as accountName,
          a.type as category,
          SUM(je.debit) as debitBalance,
          SUM(je.credit) as creditBalance
        FROM chart_of_accounts a
        LEFT JOIN journal_entries je ON a.code = je.account_code
        WHERE je.company_id = ? AND je.branch_id = ? 
          AND je.date <= ? AND je.deleted_at IS NULL
        GROUP BY a.code, a.name, a.type
        ORDER BY a.code
      `).all(companyId, branchId, endDate) as any[]

      const totalDebits = accounts.reduce((sum, acc) => sum + (acc.debitBalance || 0), 0)
      const totalCredits = accounts.reduce((sum, acc) => sum + (acc.creditBalance || 0), 0)

      return {
        period: 'custom',
        accounts: accounts.map(a => ({
          ...a,
          debitBalance: a.debitBalance || 0,
          creditBalance: a.creditBalance || 0
        })),
        totalDebits,
        totalCredits
      }
    } catch (error) {
      throw createError.internal('Mizan oluÅŸturulamadÄ±: ' + error)
    }
  }

  async getIncomeStatement(companyId: string, branchId: string, startDate: string, endDate: string): Promise<IncomeStatement> {
    try {
      const db = this.getDb()
      
      // 6 ile baÅŸlayan tÃ¼m gelir-gider hesaplarÄ±nÄ± Ã§ek
      const activities = db.prepare(`
        SELECT 
          account_code,
          SUM(credit - debit) as net
        FROM journal_entries
        WHERE company_id = ? AND branch_id = ? 
          AND date BETWEEN ? AND ? AND deleted_at IS NULL
          AND account_code LIKE '6%'
        GROUP BY account_code
      `).all(companyId, branchId, startDate, endDate) as any[]

      const salesRevenue = activities.filter(a => a.account_code.startsWith('600')).reduce((s, a) => s + a.net, 0)
      const costOfGoodsSold = Math.abs(activities.filter(a => a.account_code.startsWith('62')).reduce((s, a) => s + a.net, 0))
      
      const operatingExpenses = Math.abs(activities.filter(a => a.account_code.startsWith('63')).reduce((s, a) => s + a.net, 0))
      
      const totalRevenue = salesRevenue
      const grossProfit = totalRevenue - costOfGoodsSold
      const operatingIncome = grossProfit - operatingExpenses
      const netIncome = operatingIncome // BasitleÅŸtirilmiÅŸ

      return {
        period: 'custom',
        startDate,
        endDate,
        revenue: {
          salesRevenue,
          serviceRevenue: 0,
          otherRevenue: 0,
          totalRevenue
        },
        expenses: {
          costOfGoodsSold,
          operatingExpenses: {
            salaries: 0,
            rent: 0,
            utilities: 0,
            supplies: 0,
            depreciation: 0,
            other: operatingExpenses,
            total: operatingExpenses
          },
          interestExpenses: 0,
          taxExpenses: 0,
          otherExpenses: 0,
          totalExpenses: costOfGoodsSold + operatingExpenses
        },
        profitability: {
          grossProfit,
          operatingIncome,
          netIncome,
          grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          operatingMargin: totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0,
          netMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
        }
      }
    } catch (error) {
      throw createError.internal('Gelir tablosu oluÅŸturulamadÄ±: ' + error)
    }
  }

  async getBalanceSheet(companyId: string, branchId: string, endDate: string): Promise<BalanceSheet> {
    try {
      const db = this.getDb()
      
      const balances = db.prepare(`
        SELECT 
          SUBSTR(account_code, 1, 1) as main_group,
          SUM(debit - credit) as balance
        FROM journal_entries
        WHERE company_id = ? AND branch_id = ? 
          AND date <= ? AND deleted_at IS NULL
        GROUP BY main_group
      `).all(companyId, branchId, endDate) as any[]

      const getGroupBalance = (group: string) => balances.find(b => b.main_group === group)?.balance || 0

      const assets = getGroupBalance('1') + getGroupBalance('2')
      const liabilities = Math.abs(getGroupBalance('3') + getGroupBalance('4'))
      const equity = Math.abs(getGroupBalance('5'))

      return {
        period: 'custom',
        startDate: '2020-01-01',
        endDate,
        assets: {
          currentAssets: { cash: getGroupBalance('100'), bank: getGroupBalance('102'), accountsReceivable: getGroupBalance('120'), inventory: getGroupBalance('150'), other: 0 },
          fixedAssets: { property: 0, equipment: getGroupBalance('255'), vehicles: 0, accumulatedDepreciation: 0 }
        },
        liabilities: {
          currentLiabilities: { accountsPayable: Math.abs(getGroupBalance('320')), shortTermDebt: 0, taxesPayable: 0, other: 0 },
          longTermLiabilities: { longTermDebt: 0, other: 0 }
        },
        equity: {
          ownerEquity: equity,
          retainedEarnings: 0,
          capital: equity
        }
      }
    } catch (error) {
       throw createError.internal('BilanÃ§o oluÅŸturulamadÄ±: ' + error)
    }
  }

  async getCashFlowStatement(period: string, startDate: string, endDate: string): Promise<Record<string, any>> {
    try {
      const db = this.getDb()
      const rows = db.prepare(`
        SELECT account_code, SUM(debit) as total_debit, SUM(credit) as total_credit
        FROM journal_entries
        WHERE deleted_at IS NULL
          AND (? = '' OR date >= ?)
          AND date <= ?
        GROUP BY account_code
      `).all(startDate, startDate, endDate) as any[]

      const operating = rows.filter(r => r.account_code?.startsWith('1') || r.account_code?.startsWith('6'))
      const investing = rows.filter(r => r.account_code?.startsWith('2') || r.account_code?.startsWith('25'))
      const financing = rows.filter(r => r.account_code?.startsWith('3') || r.account_code?.startsWith('4') || r.account_code?.startsWith('5'))

      const sum = (items: any[]) => items.reduce((s, r) => s + ((r.total_credit || 0) - (r.total_debit || 0)), 0)

      return {
        period,
        startDate,
        endDate,
        operating: { total: sum(operating) },
        investing: { total: sum(investing) },
        financing: { total: sum(financing) },
        netCashFlow: sum(rows)
      }
    } catch (error) {
      throw createError.internal('Nakit akÄ±ÅŸ tablosu oluÅŸturulamadÄ±: ' + error)
    }
  }

  async getSalesReport(period: string, startDate: string, endDate: string): Promise<Record<string, any>> {
    try {
      const db = this.getDb()
      const rows = db.prepare(`
        SELECT account_code, SUM(credit) as total_credit, SUM(debit) as total_debit
        FROM journal_entries
        WHERE account_code LIKE '600%'
          AND deleted_at IS NULL
          AND (? = '' OR date >= ?)
          AND date <= ?
        GROUP BY account_code
      `).all(startDate, startDate, endDate) as any[]

      const totalSales = rows.reduce((s, r) => s + (r.total_credit || 0), 0)
      const totalReturns = rows.reduce((s, r) => s + (r.total_debit || 0), 0)
      const netSales = totalSales - totalReturns

      return {
        period,
        startDate,
        endDate,
        totalSales,
        totalReturns,
        netSales,
        rows
      }
    } catch (error) {
      throw createError.internal('SatÄ±ÅŸ raporu oluÅŸturulamadÄ±: ' + error)
    }
  }
}

export const financialReportingService = new FinancialReportingService()
