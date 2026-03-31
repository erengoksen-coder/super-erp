export interface Transaction {
  id: string
  companyId: string
  accountId: string
  amount: number
  type: 'debit' | 'credit'
  description?: string
  date: string
  category?: string
}

export interface Balance {
  accountId: string
  totalDebit: number
  totalCredit: number
  balance: number
}

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
    operatingExpenses: any
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
    changesInWorkingCapital: any
    netOperatingCash: number
  }
  investingActivities: any
  financingActivities: any
  netCashFlow: any
}

export interface TrialBalance {
  period: string
  accounts: any[]
  totalDebits: number
  totalCredits: number
}

export interface SalesReport {
  period: string
  startDate: string
  endDate: string
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  salesByProduct: any[]
  salesByCustomer: any[]
  salesByPeriod: any[]
}
