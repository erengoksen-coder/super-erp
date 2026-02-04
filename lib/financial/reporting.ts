import { getDatabase } from '@/lib/database/db'
import { 
  BalanceSheet, 
  IncomeStatement, 
  CashFlowStatement,
  TrialBalance,
  SalesReport
} from '@/types/financial'
import { createError } from '@/lib/utils/errors'

export class FinancialReportingService {
  private db = getDatabase()

  async getBalanceSheet(period: string, startDate: string, endDate: string): Promise<BalanceSheet> {
    try {
      // Get current assets
      const cash = this.getCashBalance()
      const bank = this.getBankBalance()
      const accountsReceivable = this.getAccountsReceivable()
      const inventory = this.getInventoryValue()
      
      // Get fixed assets
      const equipment = this.getEquipmentValue()
      const accumulatedDepreciation = this.getAccumulatedDepreciation()
      
      // Get liabilities
      const accountsPayable = this.getAccountsPayable()
      const taxesPayable = this.getTaxesPayable()
      const longTermDebt = this.getLongTermDebt()
      
      // Get equity
      const ownerEquity = this.getOwnerEquity()
      const retainedEarnings = this.getRetainedEarnings()

      return {
        period,
        startDate,
        endDate,
        assets: {
          currentAssets: {
            cash,
            bank,
            accountsReceivable,
            inventory,
            other: 0 // Calculate other current assets
          },
          fixedAssets: {
            property: 0, // Calculate property value
            equipment,
            vehicles: 0, // Calculate vehicle value
            accumulatedDepreciation
          }
        },
        liabilities: {
          currentLiabilities: {
            accountsPayable,
            shortTermDebt: 0, // Calculate short-term debt
            taxesPayable,
            other: 0 // Calculate other current liabilities
          },
          longTermLiabilities: {
            longTermDebt,
            other: 0 // Calculate other long-term liabilities
          }
        },
        equity: {
          ownerEquity,
          retainedEarnings,
          capital: ownerEquity // Simplified calculation
        }
      }
    } catch (error) {
      throw createError.database('Balance sheet generation failed', error)
    }
  }

  async getIncomeStatement(period: string, startDate: string, endDate: string): Promise<IncomeStatement> {
    try {
      // Get revenue data
      const salesRevenue = this.getSalesRevenue(startDate, endDate)
      const serviceRevenue = this.getServiceRevenue(startDate, endDate)
      const otherRevenue = this.getOtherRevenue(startDate, endDate)
      
      // Get expense data
      const costOfGoodsSold = this.getCostOfGoodsSold(startDate, endDate)
      const operatingExpenses = this.getOperatingExpenses(startDate, endDate)
      const interestExpenses = this.getInterestExpenses(startDate, endDate)
      const taxExpenses = this.getTaxExpenses(startDate, endDate)
      const otherExpenses = this.getOtherExpenses(startDate, endDate)
      
      // Calculate profitability
      const totalRevenue = salesRevenue + serviceRevenue + otherRevenue
      const grossProfit = totalRevenue - costOfGoodsSold
      const operatingIncome = grossProfit - operatingExpenses.total
      const netIncome = operatingIncome - interestExpenses - taxExpenses - otherExpenses
      
      return {
        period,
        startDate,
        endDate,
        revenue: {
          salesRevenue,
          serviceRevenue,
          otherRevenue,
          totalRevenue
        },
        expenses: {
          costOfGoodsSold,
          operatingExpenses,
          interestExpenses,
          taxExpenses,
          otherExpenses,
          totalExpenses: costOfGoodsSold + operatingExpenses.total + interestExpenses + taxExpenses + otherExpenses
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
      throw createError.database('Income statement generation failed', error)
    }
  }

  async getCashFlowStatement(period: string, startDate: string, endDate: string): Promise<CashFlowStatement> {
    try {
      const netIncome = this.getNetIncome(startDate, endDate)
      const depreciation = this.getDepreciation(startDate, endDate)
      
      const changesInWorkingCapital = {
        accountsReceivable: this.getAccountsReceivableChange(startDate, endDate),
        inventory: this.getInventoryChange(startDate, endDate),
        accountsPayable: this.getAccountsPayableChange(startDate, endDate),
        other: 0 // Calculate other working capital changes
      }
      
      const netOperatingCash = netIncome + depreciation + 
        changesInWorkingCapital.accountsReceivable + 
        changesInWorkingCapital.inventory + 
        changesInWorkingCapital.accountsPayable + 
        changesInWorkingCapital.other
      
      const investingActivities = {
        equipmentPurchases: this.getEquipmentPurchases(startDate, endDate),
        equipmentSales: this.getEquipmentSales(startDate, endDate),
        investments: this.getInvestmentPurchases(startDate, endDate),
        netInvestingCash: 0 // Will be calculated below
      }
      investingActivities.netInvestingCash = investingActivities.equipmentSales - investingActivities.equipmentPurchases - investingActivities.investments
      
      const financingActivities = {
        loanProceeds: this.getLoanProceeds(startDate, endDate),
        loanRepayments: this.getLoanRepayments(startDate, endDate),
        equityContributions: this.getEquityContributions(startDate, endDate),
        dividendPayments: this.getDividendPayments(startDate, endDate),
        netFinancingCash: 0 // Will be calculated below
      }
      financingActivities.netFinancingCash = 
        financingActivities.loanProceeds + 
        financingActivities.equityContributions - 
        financingActivities.loanRepayments - 
        financingActivities.dividendPayments
      
      const beginningCash = this.getCashBalanceAtDate(startDate)
      const total = netOperatingCash + investingActivities.netInvestingCash + financingActivities.netFinancingCash
      const endingCash = beginningCash + total
      
      return {
        period,
        startDate,
        endDate,
        operatingActivities: {
          netIncome,
          depreciation,
          changesInWorkingCapital,
          netOperatingCash
        },
        investingActivities,
        financingActivities,
        netCashFlow: {
          beginningCash,
          endingCash,
          total
        }
      }
    } catch (error) {
      throw createError.database('Cash flow statement generation failed', error)
    }
  }

  async getTrialBalance(period: string, endDate: string): Promise<TrialBalance> {
    try {
      const accounts = this.db.prepare(`
        SELECT 
          a.code as accountCode,
          a.name as accountName,
          a.type as category,
          SUM(CASE WHEN gl.debit_amount > 0 THEN gl.debit_amount ELSE 0 END) as debitBalance,
          SUM(CASE WHEN gl.credit_amount > 0 THEN gl.credit_amount ELSE 0 END) as creditBalance
        FROM chart_of_accounts a
        LEFT JOIN general_ledger gl ON a.code = gl.account_code
        WHERE gl.date <= ? AND gl.deleted_at IS NULL
        GROUP BY a.code, a.name, a.type
        ORDER BY a.code
      `).all(endDate) as Array<{
        accountCode: string
        accountName: string
        category: string
        debitBalance: number
        creditBalance: number
      }>

      const totalDebits = accounts.reduce((sum, acc) => sum + acc.debitBalance, 0)
      const totalCredits = accounts.reduce((sum, acc) => sum + acc.creditBalance, 0)

      return {
        period,
        accounts,
        totalDebits,
        totalCredits
      }
    } catch (error) {
      throw createError.database('Trial balance generation failed', error)
    }
  }

  async getSalesReport(period: string, startDate: string, endDate: string): Promise<SalesReport> {
    try {
      const salesData = this.db.prepare(`
        SELECT 
          i.product_id,
          p.name as productName,
          SUM(i.quantity) as quantity,
          SUM(i.total_price) as revenue
        FROM invoices inv
        JOIN invoice_items i ON inv.id = i.invoice_id
        JOIN products p ON i.product_id = p.id
        WHERE inv.invoice_date BETWEEN ? AND ?
        AND inv.status IN ('sent', 'paid')
        GROUP BY i.product_id, p.name
        ORDER BY revenue DESC
      `).all(startDate, endDate) as Array<{
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
      }>

      const totalSales = salesData.reduce((sum, item) => sum + item.revenue, 0)
      const orderResult = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM invoices 
        WHERE invoice_date BETWEEN ? AND ?
      `).get(startDate, endDate) as { count: number } | undefined
      const totalOrders = orderResult?.count || 0

      const salesByProduct = salesData.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        revenue: item.revenue,
        percentage: totalSales > 0 ? (item.revenue / totalSales) * 100 : 0
      }))

      return {
        period,
        startDate,
        endDate,
        totalSales,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
        salesByProduct,
        salesByCustomer: [], // Implement customer sales breakdown
        salesByPeriod: [] // Implement period-based breakdown
      }
    } catch (error) {
      throw createError.database('Sales report generation failed', error)
    }
  }

  // Helper methods for data calculation
  private getCashBalance(): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'payment' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getBankBalance(): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'bank_deposit' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getAccountsReceivable(): number {
    const result = this.db.prepare(`
      SELECT SUM(total_amount) as total FROM invoices 
      WHERE status IN ('sent', 'partial')
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getInventoryValue(): number {
    const result = this.db.prepare(`
      SELECT SUM(m.stock_amount * m.unit_price) as total 
      FROM materials m
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getEquipmentValue(): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'equipment_purchase' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getAccumulatedDepreciation(): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'depreciation' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getAccountsPayable(): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'purchase' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getTaxesPayable(): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'tax_payment' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getLongTermDebt(): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'loan' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getOwnerEquity(): number {
    // Simplified calculation - should be based on actual equity transactions
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'equity_contribution' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getRetainedEarnings(): number {
    // Calculate from historical profit/loss
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'retained_earnings' 
    `).get() as { total: number } | undefined
    return result?.total || 0
  }

  private getSalesRevenue(startDate: string, endDate: string): number {
    const result = this.db.prepare(`
      SELECT SUM(total_amount) as total FROM invoices 
      WHERE invoice_date BETWEEN ? AND ? AND status IN ('sent', 'paid')
    `).get(startDate, endDate) as { total: number } | undefined
    return result?.total || 0
  }

  private getServiceRevenue(startDate: string, endDate: string): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'service_revenue' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined
    return result?.total || 0
  }

  private getOtherRevenue(startDate: string, endDate: string): number {
    const result = this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'other_revenue' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined
    return result?.total || 0
  }

  private getCostOfGoodsSold(startDate: string, endDate: string): number {
    const result = this.db.prepare(`
      SELECT SUM(m.stock_amount * m.unit_cost) as total 
      FROM stock_movements sm
      JOIN materials m ON sm.material_id = m.id
      WHERE sm.movement_type = 'out' AND sm.reference_type = 'sale'
      AND sm.created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined
    return result?.total || 0
  }

  private getOperatingExpenses(startDate: string, endDate: string) {
    const salaries = (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'salary' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0

    const rent = (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'rent' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0

    const utilities = (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'utilities' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0

    const supplies = (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'supplies' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0

    const depreciation = this.getDepreciation(startDate, endDate)
    
    return {
      salaries,
      rent,
      utilities,
      supplies,
      depreciation,
      other: 0, // Calculate other operating expenses
      total: salaries + rent + utilities + supplies + depreciation
    }
  }

  private getInterestExpenses(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'interest' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getTaxExpenses(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'tax_payment' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getOtherExpenses(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'other_expense' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getNetIncome(startDate: string, endDate: string): number {
    return this.getSalesRevenue(startDate, endDate) - this.getCostOfGoodsSold(startDate, endDate)
  }

  private getDepreciation(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'depreciation' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getAccountsReceivableChange(startDate: string, _endDate: string): number { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Calculate change in accounts receivable
    const endBalance = this.getAccountsReceivable()
    const startBalance = (this.db.prepare(`
      SELECT SUM(total_amount) as total FROM invoices 
      WHERE status IN ('sent', 'partial') AND invoice_date < ?
    `).get(startDate) as { total: number } | undefined)?.total || 0
    return startBalance - endBalance
  }

  private getInventoryChange(startDate: string, _endDate: string): number { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Calculate change in inventory value
    const endValue = this.getInventoryValue()
    const startValue = (this.db.prepare(`
      SELECT SUM(stock_amount * unit_price) as total 
      FROM stock_movements 
      WHERE movement_type = 'in' AND created_at < ?
    `).get(startDate) as { total: number } | undefined)?.total || 0
    return startValue - endValue
  }

  private getAccountsPayableChange(startDate: string, _endDate: string): number { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Calculate change in accounts payable
    const endBalance = this.getAccountsPayable()
    const startBalance = (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'purchase' AND created_at < ?
    `).get(startDate) as { total: number } | undefined)?.total || 0
    return startBalance - endBalance
  }

  private getCashBalanceAtDate(date: string): number {
    return (this.db.prepare(`
      SELECT SUM(
        CASE 
          WHEN movement_type = 'in' THEN amount 
          WHEN movement_type = 'out' THEN -amount 
          ELSE 0 
        END
      ) as total 
      FROM stock_movements 
      WHERE created_at <= ?
    `).get(date) as { total: number } | undefined)?.total || 0
  }

  private getEquipmentPurchases(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'equipment_purchase' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getEquipmentSales(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'equipment_sale' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getInvestmentPurchases(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'investment' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getLoanProceeds(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'loan' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getLoanRepayments(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'loan_repayment' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getEquityContributions(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'in' AND reference_type = 'equity_contribution' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }

  private getDividendPayments(startDate: string, endDate: string): number {
    return (this.db.prepare(`
      SELECT SUM(amount) as total FROM stock_movements 
      WHERE movement_type = 'out' AND reference_type = 'dividend' 
      AND created_at BETWEEN ? AND ?
    `).get(startDate, endDate) as { total: number } | undefined)?.total || 0
  }
}

export const financialReportingService = new FinancialReportingService()