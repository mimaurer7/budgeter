import { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, currentMonth, monthKey } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

export default function Budget({ store }: Props) {
  const { data, upsertBudgetGoal, deleteBudgetGoal, setMonthlyIncome } = store
  const [month, setMonth] = useState(currentMonth())
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [goalInput, setGoalInput] = useState('')

  // Actual income earned this month from transactions
  const actualIncome = useMemo(() =>
    data.transactions
      .filter((t) => monthKey(t.date) === month && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0),
    [data.transactions, month]
  )

  // Planned income: manually set, or fall back to actual
  const plannedIncome = data.monthlyIncome[month] ?? actualIncome

  // Spending per category this month
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    data.transactions
      .filter((t) => monthKey(t.date) === month && t.type === 'expense')
      .forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount })
    return map
  }, [data.transactions, month])

  // Budget goals for this month
  const goals = data.budgetGoals.filter((g) => g.month === month)
  const totalBudgeted = goals.reduce((s, g) => s + g.monthlyLimit, 0)
  const leftToBudget = plannedIncome - totalBudgeted

  // Categories that have a goal or spending this month
  const activeCategories = data.categories.filter(
    (c) => goals.some((g) => g.category === c.name) || (spentByCategory[c.name] ?? 0) > 0
  )
  // Categories available to add a goal
  const unbudgetedCategories = data.categories.filter(
    (c) => !goals.some((g) => g.category === c.name) && c.name !== 'Income'
  )

  function saveIncome() {
    const val = parseFloat(incomeInput.replace(/[$,]/g, ''))
    if (!isNaN(val) && val >= 0) setMonthlyIncome(month, val)
    setEditingIncome(false)
  }

  function startEditGoal(categoryName: string) {
    const existing = goals.find((g) => g.category === categoryName)
    setGoalInput(existing ? String(existing.monthlyLimit) : '')
    setEditingGoal(categoryName)
  }

  function saveGoal(categoryName: string) {
    const val = parseFloat(goalInput.replace(/[$,]/g, ''))
    if (!isNaN(val) && val > 0) {
      upsertBudgetGoal({ category: categoryName, month, monthlyLimit: val })
    } else {
      const existing = goals.find((g) => g.category === categoryName)
      if (existing) deleteBudgetGoal(existing.id)
    }
    setEditingGoal(null)
  }

  const monthLabel = new Date(month + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <p className="text-gray-400 text-sm mt-0.5">{monthLabel}</p>
        </div>
        <input
          type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Income / Left to Budget banner */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Planned Income */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Monthly Income</p>
            {editingIncome ? (
              <div className="flex items-center gap-2">
                <input
                  type="number" value={incomeInput} min="0" step="0.01"
                  onChange={(e) => setIncomeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveIncome(); if (e.key === 'Escape') setEditingIncome(false) }}
                  autoFocus
                  className="w-32 bg-gray-800 border border-indigo-500 rounded px-2 py-1 text-sm focus:outline-none"
                />
                <button onClick={saveIncome} className="text-indigo-400 hover:text-indigo-300 text-xs">Save</button>
                <button onClick={() => setEditingIncome(false)} className="text-gray-500 hover:text-gray-300 text-xs">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-green-400">{formatCurrency(plannedIncome)}</span>
                <button
                  onClick={() => { setIncomeInput(String(plannedIncome)); setEditingIncome(true) }}
                  className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 rounded px-1.5 py-0.5"
                >
                  Edit
                </button>
              </div>
            )}
            {data.monthlyIncome[month] == null && actualIncome > 0 && (
              <p className="text-xs text-gray-600 mt-0.5">from transactions</p>
            )}
          </div>

          {/* Total Budgeted */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Budgeted</p>
            <span className="text-xl font-bold text-gray-200">{formatCurrency(totalBudgeted)}</span>
          </div>

          {/* Left to Budget */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Left to Budget</p>
            <span className={`text-xl font-bold ${leftToBudget < 0 ? 'text-red-400' : leftToBudget === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {formatCurrency(leftToBudget)}
            </span>
            {leftToBudget === 0 && <p className="text-xs text-green-600 mt-0.5">Every dollar has a job!</p>}
            {leftToBudget < 0 && <p className="text-xs text-red-500 mt-0.5">Over budget by {formatCurrency(Math.abs(leftToBudget))}</p>}
          </div>
        </div>

        {/* Allocation bar */}
        {plannedIncome > 0 && (
          <div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${leftToBudget < 0 ? 'bg-red-500' : leftToBudget === 0 ? 'bg-green-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min((totalBudgeted / plannedIncome) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.min(Math.round((totalBudgeted / plannedIncome) * 100), 100)}% of income allocated
            </p>
          </div>
        )}
      </div>

      {/* Budget line items */}
      {activeCategories.length === 0 && goals.length === 0 ? (
        <p className="text-gray-500 text-sm mb-6">No budget items yet. Add categories below to get started.</p>
      ) : (
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-2 px-4 pb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Category</span>
            <span className="text-right">Budgeted</span>
            <span className="text-right">Spent</span>
            <span className="text-right">Remaining</span>
          </div>
          <div className="space-y-2">
            {data.categories
              .filter((c) => goals.some((g) => g.category === c.name) || (spentByCategory[c.name] ?? 0) > 0)
              .map((cat) => {
                const goal = goals.find((g) => g.category === cat.name)
                const budgeted = goal?.monthlyLimit ?? 0
                const spent = spentByCategory[cat.name] ?? 0
                const remaining = budgeted - spent
                const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0
                const isEditing = editingGoal === cat.name
                const isOver = spent > budgeted && budgeted > 0

                return (
                  <div key={cat.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                    <div className="grid grid-cols-4 gap-2 items-center mb-2">
                      {/* Category name */}
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                      </div>

                      {/* Budgeted — editable */}
                      <div className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end items-center gap-1">
                            <span className="text-gray-400 text-xs">$</span>
                            <input
                              type="number" value={goalInput} min="0" step="1"
                              onChange={(e) => setGoalInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(cat.name); if (e.key === 'Escape') setEditingGoal(null) }}
                              autoFocus
                              className="w-24 bg-gray-800 border border-indigo-500 rounded px-2 py-0.5 text-sm text-right focus:outline-none"
                            />
                            <button onClick={() => saveGoal(cat.name)} className="text-indigo-400 hover:text-indigo-300 text-xs ml-1">✓</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditGoal(cat.name)}
                            className={`text-sm font-medium hover:text-white transition-colors ${budgeted > 0 ? 'text-gray-200' : 'text-gray-600 hover:text-gray-400'}`}
                          >
                            {budgeted > 0 ? formatCurrency(budgeted) : '+ Set'}
                          </button>
                        )}
                      </div>

                      {/* Spent */}
                      <div className="text-right text-sm text-gray-400">
                        {spent > 0 ? formatCurrency(spent) : '—'}
                      </div>

                      {/* Remaining */}
                      <div className={`text-right text-sm font-medium ${isOver ? 'text-red-400' : remaining > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                        {budgeted > 0 ? (isOver ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)) : '—'}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {budgeted > 0 && (
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Add budget items */}
      {unbudgetedCategories.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Add Budget Item</p>
          <div className="flex flex-wrap gap-2">
            {unbudgetedCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => startEditGoal(cat.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-400 hover:border-indigo-500 hover:text-gray-200 transition-colors"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                + {cat.name}
                {editingGoal === cat.name && (
                  <span className="ml-1 flex items-center gap-1">
                    <input
                      type="number" value={goalInput} min="0" step="1"
                      onChange={(e) => setGoalInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(cat.name); if (e.key === 'Escape') setEditingGoal(null) }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="w-20 bg-gray-800 border border-indigo-500 rounded px-2 py-0.5 text-xs focus:outline-none"
                      placeholder="amount"
                    />
                    <button onClick={(e) => { e.stopPropagation(); saveGoal(cat.name) }} className="text-indigo-400">✓</button>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
