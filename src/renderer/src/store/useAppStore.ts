import { useState, useEffect, useCallback } from 'react'
import { AppData, Transaction, BudgetGoal, Category } from '../types'
import { EMPTY_APP_DATA, generateId } from '../utils/data'

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

export function useAppStore() {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA)
  const [dataPath, setDataPath] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const path = await window.api.getDataPath()
      setDataPath(path)
      const saved = await window.api.readData(path)
      if (saved) {
        setData({ ...EMPTY_APP_DATA, ...saved })
      }
      setLoading(false)
    }
    load()
  }, [])

  const save = useCallback(
    async (next: AppData) => {
      setData(next)
      await window.api.writeData(dataPath, next)
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
      const next = { ...data, categories: [...data.categories, { ...cat, id: generateId() }] }
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

  return {
    data,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    upsertBudgetGoal,
    deleteBudgetGoal,
    addCategory,
    importTransactions
  }
}
