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

  const actualIncome = useMemo(() =>
    data.transactions
      .filter((t) => monthKey(t.date) === month && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0),
    [data.transactions, month]
  )

  const plannedIncome = data.monthlyIncome[month] ?? actualIncome

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    data.transactions
      .filter((t) => monthKey(t.date) === month && t.type === 'expense')
      .forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount })
    return map
  }, [data.transactions, month])

  const goals = data.budgetGoals.filter((g) => g.month === month)
  const totalBudgeted = goals.reduce((s, g) => s + g.monthlyLimit, 0)
  const leftToBudget = plannedIncome - totalBudgeted
  const allocPct = plannedIncome > 0 ? Math.min((totalBudgeted / plannedIncome) * 100, 100) : 0

  function saveIncome() {
    const val = parseFloat(incomeInput.replace(/[$,]/g, ''))
    if (!isNaN(val) && val >= 0) setMonthlyIncome(month, val)
    setEditingIncome(false)
  }

  function startEditGoal(cat: string) {
    const existing = goals.find((g) => g.category === cat)
    setGoalInput(existing ? String(existing.monthlyLimit) : '')
    setEditingGoal(cat)
  }

  function saveGoal(cat: string) {
    const val = parseFloat(goalInput.replace(/[$,]/g, ''))
    if (!isNaN(val) && val > 0) {
      upsertBudgetGoal({ category: cat, month, monthlyLimit: val })
    } else {
      const existing = goals.find((g) => g.category === cat)
      if (existing) deleteBudgetGoal(existing.id)
    }
    setEditingGoal(null)
  }

  // All categories except "Income" — always show them all
  const visibleCategories = data.categories.filter((c) => c.name !== 'Income')

  const monthLabel = new Date(month + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <p className="text-sm mt-0.5" style={{ color: '#5a5a7a' }}>{monthLabel}</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{ background: '#12121e', border: '1px solid #1e1e2e', color: '#a0a0c0' }} />
      </div>

      {/* Income / allocation banner */}
      <div className="card card-glow p-6 mb-6">
        <div className="grid grid-cols-3 gap-8 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#4a4a6a' }}>Monthly Income</p>
            {editingIncome ? (
              <div className="flex items-center gap-2">
                <span style={{ color: '#5a5a7a' }}>$</span>
                <input type="number" value={incomeInput} min="0" step="0.01"
                  onChange={(e) => setIncomeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveIncome(); if (e.key === 'Escape') setEditingIncome(false) }}
                  autoFocus
                  className="w-36 px-2 py-1 text-sm rounded-lg focus:outline-none"
                  style={{ background: '#0e0e18', border: '1px solid #6366f1', color: '#d0d0f0' }} />
                <button onClick={saveIncome} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>Save</button>
                <button onClick={() => setEditingIncome(false)} className="text-xs" style={{ color: '#5a5a7a' }}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: '#22c55e' }}>{formatCurrency(plannedIncome)}</span>
                <button onClick={() => { setIncomeInput(String(plannedIncome)); setEditingIncome(true) }}
                  className="text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', color: '#6a6a8a' }}>
                  Edit
                </button>
              </div>
            )}
            {data.monthlyIncome[month] == null && actualIncome > 0 && (
              <p className="text-xs mt-1" style={{ color: '#3a3a5a' }}>auto-filled from transactions</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#4a4a6a' }}>Budgeted</p>
            <span className="text-2xl font-bold" style={{ color: '#d0d0f0' }}>{formatCurrency(totalBudgeted)}</span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#4a4a6a' }}>Left to Budget</p>
            <span className="text-2xl font-bold" style={{ color: leftToBudget < 0 ? '#ef4444' : leftToBudget === 0 ? '#22c55e' : '#f59e0b' }}>
              {formatCurrency(leftToBudget)}
            </span>
            {leftToBudget === 0 && <p className="text-xs mt-1" style={{ color: '#166534' }}>Every dollar has a job!</p>}
            {leftToBudget < 0 && <p className="text-xs mt-1" style={{ color: '#7f1d1d' }}>Over by {formatCurrency(Math.abs(leftToBudget))}</p>}
          </div>
        </div>

        {/* Allocation bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#4a4a6a' }}>
            <span>{Math.round(allocPct)}% of income allocated</span>
            <span>{formatCurrency(totalBudgeted)} / {formatCurrency(plannedIncome)}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1a1a2e' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${allocPct}%`,
                background: leftToBudget < 0 ? '#ef4444' : leftToBudget === 0 ? '#22c55e' : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
              }} />
          </div>
        </div>
      </div>

      {/* Unified category table */}
      <div className="card card-glow overflow-hidden">
        {/* Column headers */}
        <div className="grid gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
          style={{ gridTemplateColumns: '1fr 160px 160px 160px', borderBottom: '1px solid #1a1a2e', color: '#4a4a6a' }}>
          <span>Category</span>
          <span className="text-right">Budgeted</span>
          <span className="text-right">Spent</span>
          <span className="text-right">Remaining</span>
        </div>

        {visibleCategories.map((cat, i) => {
          const goal = goals.find((g) => g.category === cat.name)
          const budgeted = goal?.monthlyLimit ?? 0
          const spent = spentByCategory[cat.name] ?? 0
          const remaining = budgeted - spent
          const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0
          const isOver = budgeted > 0 && spent > budgeted
          const isEditing = editingGoal === cat.name
          const isLast = i === visibleCategories.length - 1

          return (
            <div key={cat.id} style={{ borderBottom: isLast ? 'none' : '1px solid #111118' }}>
              <div className="grid gap-4 px-5 py-4 items-center transition-colors"
                style={{ gridTemplateColumns: '1fr 160px 160px 160px' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0e0e18')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                {/* Category name */}
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                  <span className="font-medium text-sm" style={{ color: '#d0d0f0' }}>{cat.name}</span>
                </div>

                {/* Budgeted — inline edit */}
                <div className="text-right">
                  {isEditing ? (
                    <div className="flex justify-end items-center gap-1.5">
                      <span className="text-xs" style={{ color: '#5a5a7a' }}>$</span>
                      <input type="number" value={goalInput} min="0" step="1"
                        onChange={(e) => setGoalInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(cat.name); if (e.key === 'Escape') setEditingGoal(null) }}
                        autoFocus
                        className="w-24 px-2 py-1 text-sm text-right rounded-lg focus:outline-none"
                        style={{ background: '#0e0e18', border: '1px solid #6366f1', color: '#d0d0f0' }} />
                      <button onClick={() => saveGoal(cat.name)} className="text-xs px-1.5 py-1 rounded"
                        style={{ background: '#6366f1', color: 'white' }}>✓</button>
                    </div>
                  ) : (
                    <button onClick={() => startEditGoal(cat.name)}
                      className="text-sm font-medium rounded-lg px-2 py-1 transition-colors"
                      style={{ color: budgeted > 0 ? '#a0a0d0' : '#3a3a5a' }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#6366f1')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = budgeted > 0 ? '#a0a0d0' : '#3a3a5a')}>
                      {budgeted > 0 ? formatCurrency(budgeted) : '+ Set goal'}
                    </button>
                  )}
                </div>

                {/* Spent */}
                <div className="text-right text-sm" style={{ color: spent > 0 ? '#9090b0' : '#3a3a5a' }}>
                  {spent > 0 ? formatCurrency(spent) : '—'}
                </div>

                {/* Remaining */}
                <div className="text-right text-sm font-semibold"
                  style={{ color: budgeted === 0 ? '#3a3a5a' : isOver ? '#ef4444' : remaining === 0 ? '#22c55e' : '#a0a0d0' }}>
                  {budgeted === 0 ? '—' : isOver ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                </div>
              </div>

              {/* Progress bar — only when a goal is set */}
              {budgeted > 0 && (
                <div className="px-5 pb-3">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: '#1a1a2e' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isOver ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#6366f1'
                      }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
