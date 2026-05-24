import { useState, useEffect, useCallback } from 'react'
import { AppData, Transaction, BudgetGoal, Category } from '../types'
import { EMPTY_APP_DATA, DEFAULT_CATEGORIES, generateId, normalizeDate } from '../utils/data'

declare global {
  interface Window {
    api: {
      readData: (path: string) => Promise<AppData | null>
      writeData: (path: string, data: AppData) => Promise<{ success: boolean; error?: string }>
      openCsvDialog: () => Promise<string | null>
      getDataPath: () => Promise<string>
    }
  }
}

export type SaveStatus = 'saved' | 'saving' | 'error'

export function useAppStore() {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA)
  const [dataPath, setDataPath] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  useEffect(() => {
    async function load() {
      const path = await window.api.getDataPath()
      setDataPath(path)
      const saved = await window.api.readData(path)
      if (saved) {
        // Merge in any new default categories that don't exist in saved data yet
        const savedNames = new Set((saved.categories ?? []).map((c) => c.name))
        const newDefaults = DEFAULT_CATEGORIES.filter((c) => !savedNames.has(c.name))
        const mergedCategories: Category[] = [
          ...(saved.categories ?? []).map((c) => ({
            hidden: false,
            custom: false,
            ...c,
            transfer: ['Transfer', 'Savings Withdrawal'].includes(c.name) ? true : (c.transfer ?? false),
            savings: ['Savings', 'Emergency Fund', 'Investments'].includes(c.name) ? true : (c.savings ?? false),
          })),
          ...newDefaults,
        ]

        const migrated: AppData = {
          ...EMPTY_APP_DATA,
          ...saved,
          savingsBalance: saved.savingsBalance ?? 0,
          categories: mergedCategories,
          transactions: (saved.transactions ?? []).map((t) => {
            let category = t.category
            // Fix legacy 'Other' label (renamed to 'Uncategorized')
            if (category === 'Other') category = 'Uncategorized'
            // Fix expense transactions wrongly marked Savings Withdrawal —
            // only income (credits) can be a withdrawal from savings
            if (category === 'Savings Withdrawal' && t.type === 'expense') category = 'Savings'
            return { ...t, date: normalizeDate(t.date), category }
          })
        }
        setData(migrated)
        await window.api.writeData(path, migrated)
      }
      setLoading(false)
    }
    load()
  }, [])

  const save = useCallback(
    async (next: AppData) => {
      setData(next)
      if (!dataPath) return
      setSaveStatus('saving')
      const result = await window.api.writeData(dataPath, next)
      if (result?.success) {
        setSaveStatus('saved')
      } else {
        console.error('Save failed:', result?.error)
        setSaveStatus('error')
      }
    },
    [dataPath]
  )

  const addTransaction = useCallback(
    (t: Omit<Transaction, 'id'>) => {
      const next = { ...data, transactions: [...data.transactions, { ...t, id: generateId() }] }
      save(next)
    },
    [data, save]
  )

  const updateTransaction = useCallback(
    (id: string, updates: Partial<Transaction>) => {
      const next = {
        ...data,
        transactions: data.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t))
      }
      save(next)
    },
    [data, save]
  )

  const deleteTransaction = useCallback(
    (id: string) => {
      const next = { ...data, transactions: data.transactions.filter((t) => t.id !== id) }
      save(next)
    },
    [data, save]
  )

  const upsertBudgetGoal = useCallback(
    (goal: Omit<BudgetGoal, 'id'> & { id?: string }) => {
      const existing = data.budgetGoals.find(
        (g) => g.category === goal.category && g.month === goal.month
      )
      const next = existing
        ? {
            ...data,
            budgetGoals: data.budgetGoals.map((g) =>
              g.id === existing.id ? { ...g, ...goal } : g
            )
          }
        : {
            ...data,
            budgetGoals: [...data.budgetGoals, { ...goal, id: goal.id ?? generateId() }]
          }
      save(next)
    },
    [data, save]
  )

  const deleteBudgetGoal = useCallback(
    (id: string) => {
      const next = { ...data, budgetGoals: data.budgetGoals.filter((g) => g.id !== id) }
      save(next)
    },
    [data, save]
  )

  const addCategory = useCallback(
    (cat: Omit<Category, 'id'>) => {
      const next = { ...data, categories: [...data.categories, { ...cat, id: generateId(), custom: true }] }
      save(next)
    },
    [data, save]
  )

  const deleteCategory = useCallback(
    (id: string) => {
      const next = { ...data, categories: data.categories.filter((c) => c.id !== id) }
      save(next)
    },
    [data, save]
  )

  const toggleCategoryVisibility = useCallback(
    (id: string) => {
      const next = {
        ...data,
        categories: data.categories.map((c) =>
          c.id === id ? { ...c, hidden: !c.hidden } : c
        )
      }
      save(next)
    },
    [data, save]
  )

  const setMonthlyIncome = useCallback(
    (month: string, amount: number) => {
      const next = { ...data, monthlyIncome: { ...data.monthlyIncome, [month]: amount } }
      save(next)
    },
    [data, save]
  )

  const setSavingsBalance = useCallback(
    (amount: number) => {
      const next = { ...data, savingsBalance: amount }
      save(next)
    },
    [data, save]
  )

  const importTransactions = useCallback(
    (transactions: Omit<Transaction, 'id'>[]) => {
      const withIds = transactions.map((t) => ({ ...t, id: generateId() }))
      const next = { ...data, transactions: [...data.transactions, ...withIds] }
      save(next)
    },
    [data, save]
  )

  const manualSave = useCallback(() => save(data), [data, save])

  const copyBudgetFromLastMonth = useCallback(
    (month: string) => {
      // Find previous month
      const [y, m] = month.split('-').map(Number)
      const prevDate = new Date(y, m - 2, 1)
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
      const prevGoals = data.budgetGoals.filter((g) => g.month === prevMonth)
      if (prevGoals.length === 0) return
      // Only copy goals that don't already exist in target month
      const existingCats = new Set(data.budgetGoals.filter((g) => g.month === month).map((g) => g.category))
      const newGoals = prevGoals
        .filter((g) => !existingCats.has(g.category))
        .map((g) => ({ ...g, id: generateId(), month }))
      if (newGoals.length === 0) return
      const next = { ...data, budgetGoals: [...data.budgetGoals, ...newGoals] }
      save(next)
    },
    [data, save]
  )

  return {
    data,
    loading,
    saveStatus,
    manualSave,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    upsertBudgetGoal,
    deleteBudgetGoal,
    addCategory,
    deleteCategory,
    toggleCategoryVisibility,
    importTransactions,
    setMonthlyIncome,
    setSavingsBalance,
    copyBudgetFromLastMonth,
  }
}
