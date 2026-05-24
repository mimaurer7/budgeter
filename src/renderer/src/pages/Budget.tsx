import { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, currentMonth, monthKey, normalizeDate } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

export default function Budget({ store }: Props) {
  const { data, upsertBudgetGoal, deleteBudgetGoal, setMonthlyIncome, addCategory, deleteCategory, toggleCategoryVisibility, copyBudgetFromLastMonth, updateTransaction } = store
  const [month, setMonth] = useState(currentMonth())
  const [editingIncome, setEditingIncome] = useState(false)
  const [incomeInput, setIncomeInput] = useState('')
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [showManage, setShowManage] = useState(false)
  const [showTransferReview, setShowTransferReview] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const transferCats = useMemo(() =>
    new Set(data.categories.filter((c) => c.transfer).map((c) => c.name)),
    [data.categories]
  )

  const actualIncome = useMemo(() =>
    data.transactions
      .filter((t) => monthKey(t.date) === month && t.type === 'income' && !transferCats.has(t.category))
      .reduce((s, t) => s + t.amount, 0),
    [data.transactions, month, transferCats]
  )

  const plannedIncome = data.monthlyIncome[month] ?? actualIncome

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    data.transactions
      .filter((t) => monthKey(t.date) === month && t.type === 'expense' && !transferCats.has(t.category))
      .forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount })
    return map
  }, [data.transactions, month, transferCats])

  const txnsByCategory = useMemo(() => {
    const map: Record<string, typeof data.transactions> = {}
    data.transactions
      .filter((t) => monthKey(t.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((t) => {
        if (!map[t.category]) map[t.category] = []
        map[t.category].push(t)
      })
    return map
  }, [data.transactions, month])

  // 6-month average spend per category (excluding current month)
  const avgSpentByCategory = useMemo(() => {
    const pastMonths = [...new Set(
      data.transactions
        .filter(t => monthKey(t.date) !== month)
        .map(t => monthKey(t.date))
    )].sort().slice(-6)
    if (pastMonths.length === 0) return {} as Record<string, number>
    const sums: Record<string, number> = {}
    data.transactions
      .filter(t => pastMonths.includes(monthKey(t.date)) && t.type === 'expense' && !transferCats.has(t.category))
      .forEach(t => { sums[t.category] = (sums[t.category] ?? 0) + t.amount })
    const avg: Record<string, number> = {}
    for (const [cat, total] of Object.entries(sums)) avg[cat] = total / pastMonths.length
    return avg
  }, [data.transactions, month, transferCats])

  // Recurring transactions from past months not yet seen this month
  const missingRecurring = useMemo(() => {
    const currentDescs = new Set(
      data.transactions.filter(t => monthKey(t.date) === month).map(t => t.description)
    )
    const seen = new Map<string, { description: string; amount: number; category: string }>()
    data.transactions
      .filter(t => t.recurring && monthKey(t.date) !== month)
      .forEach(t => { if (!seen.has(t.description)) seen.set(t.description, t) })
    return [...seen.values()].filter(r => !currentDescs.has(r.description))
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

  function addCustomCategory() {
    const name = newCatName.trim()
    if (!name) return
    if (data.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return
    addCategory({ name, color: newCatColor, custom: true })
    setNewCatName('')
    setNewCatColor('#6366f1')
  }

  function toggleExpand(catName: string) {
    setExpandedCategory(prev => prev === catName ? null : catName)
  }

  const visibleCategories = data.categories.filter((c) =>
    c.name !== 'Income' && !c.hidden && (!c.transfer || c.name === 'Savings Withdrawal')
  )

  const withdrawnByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    data.transactions
      .filter((t) => monthKey(t.date) === month && t.type === 'income' && transferCats.has(t.category))
      .forEach((t) => { map[t.category] = (map[t.category] ?? 0) + t.amount })
    return map
  }, [data.transactions, month, transferCats])

  const allManageCategories = data.categories.filter((c) => c.name !== 'Income')
  const allCategoryNames = data.categories.map((c) => c.name)
  const uncategorizedCount = (txnsByCategory['Uncategorized'] ?? []).filter(t => t.type === 'expense').length

  const transferTxnsThisMonth = useMemo(() =>
    data.transactions
      .filter((t) => monthKey(t.date) === month && transferCats.has(t.category) && t.category !== 'Savings Withdrawal')
      .sort((a, b) => b.date.localeCompare(a.date)),
    [data.transactions, month, transferCats]
  )

  const monthLabel = new Date(month + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const hasPrevGoals = data.budgetGoals.some((g) => g.month === prevMonth)

  const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {hasPrevGoals && (
            <button onClick={() => copyBudgetFromLastMonth(month)}
              className="text-xs px-3 py-2 rounded-xl transition-colors"
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-chart)' }}>
              Copy Last Month
            </button>
          )}
          <button onClick={() => setShowManage(!showManage)}
            className="text-xs px-3 py-2 rounded-xl transition-colors"
            style={{ background: showManage ? '#6366f1' : 'var(--bg-muted)', border: '1px solid var(--border)', color: showManage ? 'white' : 'var(--text-chart)' }}>
            Manage Categories
          </button>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Category management panel */}
      {showManage && (
        <div className="card card-glow p-5 mb-6">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Manage Categories</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Show / Hide</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {allManageCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="text-sm truncate" style={{ color: cat.hidden ? 'var(--text-very-muted)' : 'var(--text-secondary)' }}>{cat.name}</span>
                      {cat.custom && (
                        <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: '#ebe9ff', color: '#6366f1', fontSize: '10px' }}>custom</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {confirmDeleteId === cat.id ? (
                        <>
                          <span className="text-xs" style={{ color: '#dc2626' }}>Delete?</span>
                          <button onClick={() => { deleteCategory(cat.id); setConfirmDeleteId(null) }}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>Yes</button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>No</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => toggleCategoryVisibility(cat.id)}
                            className="text-xs px-2 py-1 rounded-lg transition-colors"
                            style={{
                              background: cat.hidden ? 'var(--bg-muted)' : '#f0fdf4',
                              color: cat.hidden ? 'var(--text-muted)' : '#16a34a',
                              border: `1px solid ${cat.hidden ? 'var(--border)' : '#bbf7d0'}`
                            }}>
                            {cat.hidden ? 'Hidden' : 'Visible'}
                          </button>
                          {cat.custom && (
                            <button onClick={() => setConfirmDeleteId(cat.id)}
                              className="text-xs px-2 py-1 rounded-lg transition-colors"
                              style={{ background: 'var(--bg-muted)', color: 'var(--text-very-muted)', border: '1px solid var(--border)' }}
                              onMouseEnter={e => ((e.target as HTMLElement).style.color = '#dc2626')}
                              onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-very-muted)')}>
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Add Custom Category</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
                  <input type="text" value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
                    placeholder="e.g. Hobbies"
                    className="w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
                    style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer"
                      style={{ border: '1px solid var(--border)', padding: '2px' }} />
                    <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{newCatColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Quick colors</label>
                  <div className="flex flex-wrap gap-2">
                    {['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#0ea5e9','#22c55e','#f97316','#84cc16','#14b8a6','#fb7185'].map((c) => (
                      <button key={c} onClick={() => setNewCatColor(c)}
                        className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                        style={{ background: c, outline: newCatColor === c ? `2px solid #6366f1` : 'none', outlineOffset: '2px' }} />
                    ))}
                  </div>
                </div>
                <button onClick={addCustomCategory} disabled={!newCatName.trim()}
                  className="w-full py-2 text-sm rounded-xl font-medium"
                  style={{
                    background: newCatName.trim() ? '#6366f1' : 'var(--border-light)',
                    color: newCatName.trim() ? 'white' : 'var(--text-very-muted)',
                    cursor: newCatName.trim() ? 'pointer' : 'not-allowed'
                  }}>
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recurring warning */}
      {missingRecurring.length > 0 && (
        <div className="flex items-start gap-3 px-5 py-3 rounded-xl mb-4"
          style={{ background: '#f5f3ff', border: '1px solid #c4b5fd' }}>
          <span style={{ color: '#7c3aed', marginTop: 1 }}>↺</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: '#5b21b6' }}>
              {missingRecurring.length} recurring transaction{missingRecurring.length !== 1 ? 's' : ''} not yet seen this month
            </p>
            <ul className="mt-1 space-y-0.5">
              {missingRecurring.map((r) => (
                <li key={r.description} className="text-xs flex items-center gap-2" style={{ color: '#7c3aed' }}>
                  <span className="truncate">{r.description}</span>
                  <span style={{ color: '#a78bfa' }}>·</span>
                  <span className="shrink-0">{r.category}</span>
                  <span style={{ color: '#a78bfa' }}>·</span>
                  <span className="shrink-0 font-medium">{formatCurrency(r.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Uncategorized prompt */}
      {uncategorizedCount > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-xl mb-4 cursor-pointer"
          style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}
          onClick={() => {
            setExpandedCategory(prev => prev === 'Uncategorized' ? null : 'Uncategorized')
            setTimeout(() => {
              document.getElementById('cat-row-Uncategorized')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 50)
          }}>
          <div className="flex items-center gap-3">
            <span style={{ color: '#d97706' }}>⚠</span>
            <span className="text-sm font-medium" style={{ color: '#92400e' }}>
              {uncategorizedCount} transaction{uncategorizedCount !== 1 ? 's' : ''} in <strong>Uncategorized</strong> this month
            </span>
          </div>
          <span className="text-xs px-3 py-1 rounded-lg" style={{ background: '#fef3c7', color: '#d97706' }}>Review →</span>
        </div>
      )}

      {/* Transfer review banner */}
      {transferTxnsThisMonth.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-xl mb-4 cursor-pointer"
          style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}
          onClick={() => setShowTransferReview((v) => !v)}>
          <div className="flex items-center gap-3">
            <span style={{ color: '#2563eb' }}>⇆</span>
            <span className="text-sm font-medium" style={{ color: '#1e40af' }}>
              {transferTxnsThisMonth.length} transfer transaction{transferTxnsThisMonth.length !== 1 ? 's' : ''} this month — reassign to budget categories
            </span>
          </div>
          <span className="text-xs px-3 py-1 rounded-lg" style={{ background: '#dbeafe', color: '#2563eb' }}>
            {showTransferReview ? 'Hide ▲' : 'Review →'}
          </span>
        </div>
      )}

      {showTransferReview && transferTxnsThisMonth.length > 0 && (
        <div className="card card-glow overflow-hidden mb-6">
          <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide"
            style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)', background: 'var(--bg-input)' }}>
            Transfer Transactions — click a category to reassign
          </div>
          {transferTxnsThisMonth.map((txn, ti) => {
            const d = new Date(txn.date + 'T00:00:00')
            const dateLabel = isNaN(d.getTime()) ? txn.date : d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
            return (
              <div key={txn.id} className="flex items-center gap-4 px-5 py-3"
                style={{ borderBottom: ti < transferTxnsThisMonth.length - 1 ? '1px solid var(--border-row)' : 'none' }}>
                <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-very-muted)' }}>{dateLabel}</span>
                <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-chart)' }}>{txn.description}</span>
                <span className="text-sm font-medium shrink-0 w-24 text-right"
                  style={{ color: txn.type === 'income' ? '#16a34a' : 'var(--text-chart)' }}>
                  {txn.type === 'income' ? '+' : ''}{formatCurrency(txn.amount)}
                </span>
                <select value={txn.category}
                  onChange={(e) => updateTransaction(txn.id, { category: e.target.value })}
                  className="text-xs px-2 py-1 rounded-lg focus:outline-none shrink-0"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', maxWidth: '160px' }}>
                  {allCategoryNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}

      {/* Income / allocation banner */}
      <div className="card card-glow p-5 mb-6">
        <div className="grid grid-cols-3 gap-8 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Monthly Income</p>
            {editingIncome ? (
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--text-muted)' }}>$</span>
                <input type="number" value={incomeInput} min="0" step="0.01" autoFocus
                  onChange={(e) => setIncomeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveIncome(); if (e.key === 'Escape') setEditingIncome(false) }}
                  className="w-36 px-2 py-1 text-sm rounded-lg focus:outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid #6366f1', color: 'var(--text-primary)' }} />
                <button onClick={saveIncome} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>Save</button>
                <button onClick={() => setEditingIncome(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: '#16a34a' }}>{formatCurrency(plannedIncome)}</span>
                <button onClick={() => { setIncomeInput(String(plannedIncome)); setEditingIncome(true) }}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  Edit
                </button>
              </div>
            )}
            {data.monthlyIncome[month] == null && actualIncome > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-very-muted)' }}>auto-filled from transactions</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Budgeted</p>
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalBudgeted)}</span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Left to Budget</p>
            <span className="text-2xl font-bold" style={{ color: leftToBudget < 0 ? '#dc2626' : leftToBudget === 0 ? '#16a34a' : '#d97706' }}>
              {formatCurrency(leftToBudget)}
            </span>
            {leftToBudget === 0 && <p className="text-xs mt-1" style={{ color: '#16a34a' }}>Every dollar has a job!</p>}
            {leftToBudget < 0 && <p className="text-xs mt-1" style={{ color: '#dc2626' }}>Over by {formatCurrency(Math.abs(leftToBudget))}</p>}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            <span>{Math.round(allocPct)}% of income allocated</span>
            <span>{formatCurrency(totalBudgeted)} / {formatCurrency(plannedIncome)}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${allocPct}%`,
                background: leftToBudget < 0 ? '#dc2626' : leftToBudget === 0 ? '#16a34a' : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
              }} />
          </div>
        </div>
      </div>

      {/* Category table */}
      <div className="card card-glow overflow-hidden">
        <div className="grid gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
          style={{ gridTemplateColumns: '1fr 160px 160px 160px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
          <span>Category</span>
          <span className="text-right">Budgeted</span>
          <span className="text-right">Spent</span>
          <span className="text-right">Remaining</span>
        </div>

        {visibleCategories.length === 0 && (
          <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-very-muted)' }}>All categories are hidden. Use "Manage Categories" to show some.</p>
        )}

        {visibleCategories.map((cat, i) => {
          const isTransferRow = cat.transfer
          const goal = isTransferRow ? undefined : goals.find((g) => g.category === cat.name)
          const budgeted = goal?.monthlyLimit ?? 0
          const spent = isTransferRow
            ? (withdrawnByCategory[cat.name] ?? 0)
            : (spentByCategory[cat.name] ?? 0)
          const remaining = budgeted - spent
          const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0
          const isOver = budgeted > 0 && spent > budgeted
          const isEditing = editingGoal === cat.name
          const isExpanded = expandedCategory === cat.name
          const isLast = i === visibleCategories.length - 1
          const catTxns = txnsByCategory[cat.name] ?? []
          const avg = avgSpentByCategory[cat.name]

          return (
            <div key={cat.id} id={`cat-row-${cat.name}`}
              style={{
                borderBottom: isLast && !isExpanded ? 'none' : '1px solid var(--border-row)',
                background: isOver ? 'rgba(220,38,38,0.04)' : 'transparent'
              }}>
              <div className="grid gap-4 px-5 py-4 items-center transition-colors"
                style={{ gridTemplateColumns: '1fr 160px 160px 160px' }}
                onMouseEnter={e => (e.currentTarget.style.background = isOver ? 'rgba(220,38,38,0.07)' : 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = isOver ? 'rgba(220,38,38,0.04)' : 'transparent')}>

                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExpand(cat.name)}
                    className="flex items-center gap-3 text-left"
                    title={catTxns.length > 0 ? `${catTxns.length} transaction${catTxns.length !== 1 ? 's' : ''} — click to review` : undefined}>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                    <div>
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                      {avg !== undefined && !isTransferRow && (
                        <p className="text-xs" style={{ color: 'var(--text-very-muted)' }}>avg {formatCurrency(avg)}/mo</p>
                      )}
                    </div>
                    {cat.custom && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#ebe9ff', color: '#6366f1', fontSize: '10px' }}>custom</span>
                    )}
                    {catTxns.length > 0 && (
                      <span className="text-xs" style={{ color: 'var(--text-very-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                    )}
                  </button>
                </div>

                <div className="text-right">
                  {isTransferRow ? (
                    <span className="text-sm" style={{ color: 'var(--text-very-muted)' }}>—</span>
                  ) : isEditing ? (
                    <div className="flex justify-end items-center gap-1.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>$</span>
                      <input type="number" value={goalInput} min="0" step="1" autoFocus
                        onChange={(e) => setGoalInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveGoal(cat.name); if (e.key === 'Escape') setEditingGoal(null) }}
                        className="w-24 px-2 py-1 text-sm text-right rounded-lg focus:outline-none"
                        style={{ background: 'var(--bg-input)', border: '1px solid #6366f1', color: 'var(--text-primary)' }} />
                      <button onClick={() => saveGoal(cat.name)} className="text-xs px-1.5 py-1 rounded"
                        style={{ background: '#6366f1', color: 'white' }}>✓</button>
                    </div>
                  ) : (
                    <button onClick={() => startEditGoal(cat.name)}
                      className="text-sm font-medium rounded-lg px-2 py-1 transition-colors"
                      style={{ color: budgeted > 0 ? 'var(--text-secondary)' : 'var(--text-very-muted)' }}
                      onMouseEnter={e => ((e.target as HTMLElement).style.color = '#6366f1')}
                      onMouseLeave={e => ((e.target as HTMLElement).style.color = budgeted > 0 ? 'var(--text-secondary)' : 'var(--text-very-muted)')}>
                      {budgeted > 0 ? formatCurrency(budgeted) : '+ Set goal'}
                    </button>
                  )}
                </div>

                <div className="text-right text-sm"
                  style={{ color: spent > 0 ? (isTransferRow ? '#7c9cc0' : 'var(--text-chart)') : 'var(--text-very-muted)' }}>
                  {spent > 0 ? formatCurrency(spent) : '—'}
                </div>

                <div className="text-right text-sm font-semibold"
                  style={{ color: budgeted === 0 ? 'var(--text-very-muted)' : isOver ? '#dc2626' : remaining === 0 ? '#16a34a' : 'var(--text-secondary)' }}>
                  {budgeted === 0 ? '—' : isOver ? `-${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
                </div>
              </div>

              {budgeted > 0 && (
                <div className="px-5 pb-3">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: isOver ? '#dc2626' : pct >= 80 ? '#d97706' : '#6366f1' }} />
                  </div>
                </div>
              )}

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border-light)', background: 'var(--bg-hover)' }}>
                  {catTxns.length === 0 ? (
                    <p className="px-8 py-3 text-xs" style={{ color: 'var(--text-very-muted)' }}>No transactions this month.</p>
                  ) : (
                    catTxns.map((txn, ti) => {
                      const d = new Date(normalizeDate(txn.date) + 'T00:00:00')
                      const dateLabel = isNaN(d.getTime()) ? txn.date : d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
                      return (
                        <div key={txn.id} className="flex items-center gap-4 px-8 py-2.5"
                          style={{ borderBottom: ti < catTxns.length - 1 ? '1px solid var(--border-row)' : 'none' }}>
                          <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-very-muted)' }}>{dateLabel}</span>
                          <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-chart)' }}>{txn.description}</span>
                          <span className="text-sm font-medium shrink-0 w-24 text-right"
                            style={{ color: txn.type === 'income' ? '#16a34a' : 'var(--text-chart)' }}>
                            {txn.type === 'income' ? '+' : ''}{formatCurrency(txn.amount)}
                          </span>
                          <select value={txn.category}
                            onChange={(e) => updateTransaction(txn.id, { category: e.target.value })}
                            className="text-xs px-2 py-1 rounded-lg focus:outline-none shrink-0"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', maxWidth: '160px' }}>
                            {allCategoryNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
