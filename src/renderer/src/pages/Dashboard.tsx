import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, currentMonth, formatDate, monthKey } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

export default function Dashboard({ store }: Props) {
  const { data, setSavingsBalance } = store
  const [editingSavings, setEditingSavings] = useState(false)
  const [savingsInput, setSavingsInput] = useState('')

  const mostRecentMonth = useMemo(() => {
    if (data.transactions.length === 0) return currentMonth()
    return data.transactions.map((t) => monthKey(t.date)).sort().at(-1)!
  }, [data.transactions])

  const [month, setMonth] = useState<string | null>(null)
  const activeMonth = month ?? mostRecentMonth

  const stats = useMemo(() => {
    const monthTxns = data.transactions.filter((t) => monthKey(t.date) === activeMonth)
    const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const net = income - expenses

    const byCategory: Record<string, number> = {}
    monthTxns.filter((t) => t.type === 'expense').forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
    })

    const recent = [...data.transactions]
      .sort((a, b) => monthKey(b.date).localeCompare(monthKey(a.date)) || b.date.localeCompare(a.date))
      .slice(0, 5)

    const allTimeIncome = data.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const allTimeExpenses = data.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    return { income, expenses, net, byCategory, recent, allTimeIncome, allTimeExpenses }
  }, [data, activeMonth])

  const monthLabel = new Date(activeMonth + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })

  function saveSavings() {
    const val = parseFloat(savingsInput.replace(/[$,]/g, ''))
    if (!isNaN(val) && val >= 0) setSavingsBalance(val)
    setEditingSavings(false)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-0.5">Dashboard</h1>
          <p className="text-sm" style={{ color: '#5a5a7a' }}>{monthLabel}</p>
        </div>
        <input type="month" value={activeMonth} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none focus:border-indigo-500"
          style={{ background: '#12121e', border: '1px solid #1e1e2e', color: '#a0a0c0' }} />
      </div>

      {/* Monthly stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Income" value={formatCurrency(stats.income)} color="#22c55e" accent="stat-income" />
        <StatCard label="Expenses" value={formatCurrency(stats.expenses)} color="#ef4444" accent="stat-expense" />
        <StatCard label="Net" value={formatCurrency(stats.net)} color={stats.net >= 0 ? '#22c55e' : '#ef4444'} accent="stat-net" />
      </div>

      {/* All-time stats + savings */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="All-Time Earned" value={formatCurrency(stats.allTimeIncome)} color="#22c55e" accent="stat-income"
          sub={`${data.transactions.filter(t => t.type === 'income').length} deposits`} small />
        <StatCard label="All-Time Spent" value={formatCurrency(stats.allTimeExpenses)} color="#ef4444" accent="stat-expense"
          sub={`${data.transactions.filter(t => t.type === 'expense').length} transactions`} small />
        <StatCard label="Net Savings" value={formatCurrency(stats.allTimeIncome - stats.allTimeExpenses)}
          color={(stats.allTimeIncome - stats.allTimeExpenses) >= 0 ? '#22c55e' : '#ef4444'} accent="stat-neutral"
          sub="all time" small />

        {/* Savings balance — manually adjustable */}
        <div className="card card-glow stat-neutral p-5">
          <p className="text-xs mb-1.5 font-medium uppercase tracking-wide" style={{ color: '#5a5a7a' }}>Savings Balance</p>
          {editingSavings ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm" style={{ color: '#5a5a7a' }}>$</span>
              <input
                type="number" value={savingsInput} min="0" step="0.01" autoFocus
                onChange={(e) => setSavingsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveSavings(); if (e.key === 'Escape') setEditingSavings(false) }}
                className="w-28 px-2 py-1 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0e0e18', border: '1px solid #6366f1', color: '#d0d0f0' }} />
              <button onClick={saveSavings} className="text-xs px-1.5 py-1 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>✓</button>
            </div>
          ) : (
            <div className="flex items-end gap-2 mt-1">
              <p className="text-lg font-bold" style={{ color: '#14b8a6' }}>{formatCurrency(data.savingsBalance ?? 0)}</p>
              <button
                onClick={() => { setSavingsInput(String(data.savingsBalance ?? 0)); setEditingSavings(true) }}
                className="text-xs px-2 py-0.5 mb-0.5 rounded-lg transition-colors"
                style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', color: '#6a6a8a' }}>
                Edit
              </button>
            </div>
          )}
          <p className="text-xs mt-1" style={{ color: '#3a3a5a' }}>manually tracked</p>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#c0c0e0' }}>Top Spending Categories</h2>
          {Object.keys(stats.byCategory).length === 0 ? (
            <p className="text-sm" style={{ color: '#3a3a5a' }}>No expenses for this month.</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amt]) => {
                const goal = data.budgetGoals.find((g) => g.category === cat && g.month === activeMonth)
                const pct = goal ? Math.min((amt / goal.monthlyLimit) * 100, 100) : null
                const catObj = data.categories.find(c => c.name === cat)
                return (
                  <li key={cat}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        {catObj && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catObj.color }} />}
                        <span style={{ color: '#c0c0e0' }}>{cat}</span>
                      </div>
                      <span style={{ color: '#6a6a8a' }}>{formatCurrency(amt)}</span>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a2e' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#6366f1' }} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#c0c0e0' }}>Recent Transactions</h2>
          {stats.recent.length === 0 ? (
            <p className="text-sm" style={{ color: '#3a3a5a' }}>No transactions yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recent.map((t) => (
                <li key={t.id} className="flex justify-between items-center">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm truncate" style={{ color: '#d0d0f0' }}>{t.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#4a4a6a' }}>{formatDate(t.date)} · {t.category}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0" style={{ color: t.type === 'income' ? '#22c55e' : '#ef4444' }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, accent, sub, small }: {
  label: string; value: string; color: string; accent: string; sub?: string; small?: boolean
}) {
  return (
    <div className={`card card-glow ${accent} p-5`}>
      <p className="text-xs mb-1.5 font-medium uppercase tracking-wide" style={{ color: '#5a5a7a' }}>{label}</p>
      <p className={`font-bold ${small ? 'text-lg' : 'text-2xl'}`} style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#3a3a5a' }}>{sub}</p>}
    </div>
  )
}
