export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  date: string        // ISO date string YYYY-MM-DD
  description: string
  amount: number      // always positive; type field determines direction
  type: TransactionType
  category: string
  notes?: string
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
}

export interface AppData {
  transactions: Transaction[]
  budgetGoals: BudgetGoal[]
  categories: Category[]
}

export type Page = 'dashboard' | 'transactions' | 'budget' | 'charts' | 'import'
