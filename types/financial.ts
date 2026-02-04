import type { DatabaseProduct, DatabaseOrder, Invoice, StockMovement } from '@/types'

export interface BalanceSheet {
  period: string
  startDate: string
  endDate: string
  assets: {
    currentAssets: {
      cash: number
      bank: number
      accountsReceivable: number
      inventory: number
      other: number
    }
    fixedAssets: {
      property: number
      equipment: number
      vehicles: number
      accumulatedDepreciation: number
    }
  }
  liabilities: {
    currentLiabilities: {
      accountsPayable: number
      shortTermDebt: number
      taxesPayable: number
      other: number
    }
    longTermLiabilities: {
      longTermDebt: number
      other: number
    }
  }
  equity: {
    ownerEquity: number
    retainedEarnings: number
    capital: number
  }
}

export interface IncomeStatement {
  period: string
  startDate: string
  endDate: string
  revenue: {
    salesRevenue: number
    serviceRevenue: number
    otherRevenue: number
    totalRevenue: number
  }
  expenses: {
    costOfGoodsSold: number
    operatingExpenses: {
      salaries: number
      rent: number
      utilities: number
      supplies: number
      depreciation: number
      other: number
    }
    interestExpenses: number
    taxExpenses: number
    otherExpenses: number
    totalExpenses: number
  }
  profitability: {
    grossProfit: number
    operatingIncome: number
    netIncome: number
    grossMargin: number
    operatingMargin: number
    netMargin: number
  }
}

export interface CashFlowStatement {
  period: string
  startDate: string
  endDate: string
  operatingActivities: {
    netIncome: number
    depreciation: number
    changesInWorkingCapital: {
      accountsReceivable: number
      inventory: number
      accountsPayable: number
      other: number
    }
    netOperatingCash: number
  }
  investingActivities: {
    equipmentPurchases: number
      equipmentSales: number
      investments: number
      netInvestingCash: number
  }
  financingActivities: {
    loanProceeds: number
    loanRepayments: number
    equityContributions: number
      dividendPayments: number
      netFinancingCash: number
  }
  netCashFlow: {
    beginningCash: number
    endingCash: number
    total: number
  }
}

export interface GeneralLedgerEntry {
  id: string
  date: string
  description: string
  debitAccount: string
  debitAmount: number
  creditAccount: string
  creditAmount: number
  referenceType: 'invoice' | 'payment' | 'purchase' | 'adjustment'
  referenceId: string
  category: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity'
}

export interface TrialBalance {
  period: string
  accounts: Array<{
    accountCode: string
    accountName: string
    debitBalance: number
    creditBalance: number
    category: string
  }>
  totalDebits: number
  totalCredits: number
}

export interface AccountAging {
  customerId: string
  customerName: string
  totalAmount: number
  aging: {
    current: number
    days30: number
    days60: number
    days90: number
    days120: number
    over120: number
  }
}

export interface SalesReport {
  period: string
  startDate: string
  endDate: string
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  salesByProduct: Array<{
    productId: string
    productName: string
    quantity: number
    revenue: number
    percentage: number
  }>
  salesByCustomer: Array<{
    customerId: string
    customerName: string
    revenue: number
    orders: number
    percentage: number
  }>
  salesByPeriod: Array<{
    period: string
    revenue: number
    orders: number
  }>
}

export interface ProfitabilityAnalysis {
  period: string
  productProfitability: Array<{
    productId: string
    productName: string
    revenue: number
    cost: number
    grossProfit: number
    grossMargin: number
    quantity: number
  }>
  overallProfitability: {
    totalRevenue: number
    totalCost: number
    grossProfit: number
    grossMargin: number
    operatingMargin: number
    netMargin: number
    returnOnAssets: number
  }
}

export interface BudgetReport {
  period: string
  budgetCategories: Array<{
    category: string
    budgetedAmount: number
    actualAmount: number
    variance: number
    variancePercentage: number
  }>
  overall: {
    totalBudgeted: number
    totalActual: number
    totalVariance: number
    totalVariancePercentage: number
  }
}

export interface FinancialKPIs {
  period: string
  liquidity: {
    currentRatio: number
    quickRatio: number
    cashRatio: number
    operatingCashFlowRatio: number
  }
  profitability: {
    grossProfitMargin: number
    operatingMargin: number
    netProfitMargin: number
    returnOnAssets: number
    returnOnEquity: number
  }
  efficiency: {
    inventoryTurnover: number
    daysSalesOutstanding: number
    assetTurnover: number
    operatingExpenseRatio: number
  }
  solvency: {
    debtToEquity: number
    debtToAssets: number
    interestCoverage: number
    longTermDebtRatio: number
  }
}