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

  const earliestDate = useMemo(() => {
    if (data.transactions.length === 0) return null
    const earliest = [...data.transactions].sort((a, b) => a.date.localeCompare(b.date))[0]
    const d = new Date(earliest.date + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
  }, [data.transactions])

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
    const expenseCount = data.transactions.filter((t) => t.type === 'expense').length
    const incomeCount = data.transactions.filter((t) => t.type === 'income').length

    return { income, expenses, net, byCategory, recent, allTimeIncome, allTimeExpenses, expenseCount, incomeCount }
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
          <p className="text-sm" style={{ color: '#8a89a8' }}>{monthLabel}</p>
        </div>
        <input type="month" value={activeMonth} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{ background: '#f5f4f8', border: '1px solid #d5d4e8', color: '#3c3b58' }} />
      </div>

      {/* Monthly stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Income" value={formatCurrency(stats.income)} color="#16a34a" accent="stat-income" />
        <StatCard label="Expenses" value={formatCurrency(stats.expenses)} color="#dc2626" accent="stat-expense" />
        <StatCard label="Net" value={formatCurrency(stats.net)} color={stats.net >= 0 ? '#16a34a' : '#dc2626'} accent="stat-net" />
      </div>

      {/* All-time stats + savings */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="All-Time Earned"
          value={formatCurrency(stats.allTimeIncome)}
          color="#16a34a" accent="stat-income"
          sub={`${stats.incomeCount} deposits${earliestDate ? ` · since ${earliestDate}` : ''}`}
          small />
        <StatCard
          label="All-Time Spent"
          value={formatCurrency(stats.allTimeExpenses)}
          color="#dc2626" accent="stat-expense"
          sub={`${stats.expenseCount} transactions${earliestDate ? ` · since ${earliestDate}` : ''}`}
          small />
        <StatCard
          label="Net Savings"
          value={formatCurrency(stats.allTimeIncome - stats.allTimeExpenses)}
          color={(stats.allTimeIncome - stats.allTimeExpenses) >= 0 ? '#16a34a' : '#dc2626'}
          accent="stat-neutral" sub="all time" small />

        {/* Savings balance */}
        <div className="card card-glow stat-neutral p-5">
          <p className="text-xs mb-1.5 font-medium uppercase tracking-wide" style={{ color: '#8a89a8' }}>Savings Balance</p>
          {editingSavings ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm" style={{ color: '#8a89a8' }}>$</span>
              <input type="number" value={savingsInput} min="0" step="0.01" autoFocus
                onChange={(e) => setSavingsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveSavings(); if (e.key === 'Escape') setEditingSavings(false) }}
                className="w-28 px-2 py-1 text-sm rounded-lg focus:outline-none"
                style={{ background: '#f5f4f8', border: '1px solid #6366f1', color: '#1e1d2e' }} />
              <button onClick={saveSavings} className="text-xs px-1.5 py-1 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>✓</button>
            </div>
          ) : (
            <div className="flex items-end gap-2 mt-1">
              <p className="text-lg font-bold" style={{ color: '#0d9488' }}>{formatCurrency(data.savingsBalance ?? 0)}</p>
              <button
                onClick={() => { setSavingsInput(String(data.savingsBalance ?? 0)); setEditingSavings(true) }}
                className="text-xs px-2 py-0.5 mb-0.5 rounded-lg"
                style={{ background: '#f0eff8', border: '1px solid #d5d4e8', color: '#8a89a8' }}>
                Edit
              </button>
            </div>
          )}
          <p className="text-xs mt-1" style={{ color: '#aeadcc' }}>manually tracked</p>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#3c3b58' }}>Top Spending Categories</h2>
          {Object.keys(stats.byCategory).length === 0 ? (
            <p className="text-sm" style={{ color: '#aeadcc' }}>No expenses for this month.</p>
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
                        <span style={{ color: '#3c3b58' }}>{cat}</span>
                      </div>
                      <span style={{ color: '#8a89a8' }}>{formatCurrency(amt)}</span>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#eae9f5' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct >= 100 ? '#dc2626' : pct >= 80 ? '#d97706' : '#6366f1' }} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#3c3b58' }}>Recent Transactions</h2>
          {stats.recent.length === 0 ? (
            <p className="text-sm" style={{ color: '#aeadcc' }}>No transactions yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recent.map((t) => (
                <li key={t.id} className="flex justify-between items-center">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm truncate" style={{ color: '#1e1d2e' }}>{t.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#aeadcc' }}>{formatDate(t.date)} · {t.category}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0" style={{ color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
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
      <p className="text-xs mb-1.5 font-medium uppercase tracking-wide" style={{ color: '#8a89a8' }}>{label}</p>
      <p className={`font-bold ${small ? 'text-lg' : 'text-2xl'}`} style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#aeadcc' }}>{sub}</p>}
    </div>
  )
}
