export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  date: string        // ISO date string YYYY-MM-DD
  description: string
  amount: number      // always positive; type field determines direction
  type: TransactionType
  category: string
  notes?: string
  recurring?: boolean
}

export interface BudgetGoal {
  id: string
  category: string
  monthlyLimit: number  // spending limit in dollars
  month: string         // YYYY-MM
}

export interface Category {
  id: string
  name: string
  color: string
  icon?: string
  hidden?: boolean
  custom?: boolean
  transfer?: boolean  // excluded from all income/expense calculations
  savings?: boolean   // tracked separately from spending (not an expense)
}

export interface AppData {
  transactions: Transaction[]
  budgetGoals: BudgetGoal[]
  categories: Category[]
  monthlyIncome: Record<string, number>  // YYYY-MM -> planned income amount
  savingsBalance: number
  debtBalance: number
}

export type Page = 'dashboard' | 'transactions' | 'budget' | 'charts' | 'import' | 'networth'
