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
  const [drillYear, setDrillYear] = useState<string | null>(null)

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

  const monthStats = useMemo(() => {
    const txns = data.transactions.filter((t) => monthKey(t.date) === activeMonth)
    const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const byCategory: Record<string, number> = {}
    txns.filter((t) => t.type === 'expense').forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
    })
    return { income, expenses, net: income - expenses, byCategory }
  }, [data.transactions, activeMonth])

  const allTime = useMemo(() => {
    const income = data.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = data.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const expenseCount = data.transactions.filter((t) => t.type === 'expense').length
    const incomeCount = data.transactions.filter((t) => t.type === 'income').length
    return { income, expenses, net: income - expenses, expenseCount, incomeCount }
  }, [data.transactions])

  const yearStats = useMemo(() => {
    const map: Record<string, { income: number; expenses: number; txCount: number }> = {}
    data.transactions.forEach((t) => {
      const yr = t.date.slice(0, 4)
      if (!map[yr]) map[yr] = { income: 0, expenses: 0, txCount: 0 }
      if (t.type === 'income') map[yr].income += t.amount
      else { map[yr].expenses += t.amount; map[yr].txCount++ }
    })
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, v]) => ({ year, ...v, net: v.income - v.expenses }))
  }, [data.transactions])

  const drillYearTxns = useMemo(() => {
    if (!drillYear) return []
    return [...data.transactions]
      .filter((t) => t.date.startsWith(drillYear))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.transactions, drillYear])

  const recent = useMemo(() =>
    [...data.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6),
    [data.transactions]
  )

  const monthLabel = new Date(activeMonth + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const colors = data.categories.reduce<Record<string, string>>((acc, c) => { acc[c.name] = c.color; return acc }, {})

  function saveSavings() {
    const val = parseFloat(savingsInput.replace(/[$,]/g, ''))
    if (!isNaN(val) && val >= 0) setSavingsBalance(val)
    setEditingSavings(false)
  }

  return (
    <div className="p-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm" style={{ color: '#8a89a8' }}>{monthLabel}</p>
        </div>
        <input type="month" value={activeMonth} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{ background: '#f5f4f8', border: '1px solid #d5d4e8', color: '#3c3b58' }} />
      </div>

      {/* ── Monthly snapshot ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Income" value={formatCurrency(monthStats.income)} color="#16a34a" accent="stat-income" />
        <StatCard label="Expenses" value={formatCurrency(monthStats.expenses)} color="#dc2626" accent="stat-expense" />
        <StatCard label="Net" value={formatCurrency(monthStats.net)} color={monthStats.net >= 0 ? '#16a34a' : '#dc2626'} accent="stat-net" />
      </div>

      {/* ── All-time summary + savings (asymmetric 2:1) ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Wide all-time card */}
        <div className="card card-glow p-6">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8a89a8' }}>All-Time Overview</p>
            {earliestDate && <span className="text-xs" style={{ color: '#aeadcc' }}>since {earliestDate}</span>}
          </div>
          <div className="grid grid-cols-3 gap-6 mt-3">
            <div>
              <p className="text-xs mb-1" style={{ color: '#8a89a8' }}>Total Earned</p>
              <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>{formatCurrency(allTime.income)}</p>
              <p className="text-xs mt-1" style={{ color: '#aeadcc' }}>{allTime.incomeCount} deposits</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#8a89a8' }}>Total Spent</p>
              <p className="text-2xl font-bold" style={{ color: '#dc2626' }}>{formatCurrency(allTime.expenses)}</p>
              <p className="text-xs mt-1" style={{ color: '#aeadcc' }}>{allTime.expenseCount} transactions</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#8a89a8' }}>Net Savings</p>
              <p className="text-2xl font-bold" style={{ color: allTime.net >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(allTime.net)}</p>
              <p className="text-xs mt-1" style={{ color: '#aeadcc' }}>all time</p>
            </div>
          </div>
        </div>

        {/* Savings balance */}
        <div className="card card-glow stat-neutral p-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#8a89a8' }}>Savings Balance</p>
          {editingSavings ? (
            <div className="flex items-center gap-1.5">
              <span style={{ color: '#8a89a8' }}>$</span>
              <input type="number" value={savingsInput} min="0" step="0.01" autoFocus
                onChange={(e) => setSavingsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveSavings(); if (e.key === 'Escape') setEditingSavings(false) }}
                className="flex-1 px-2 py-1 text-sm rounded-lg focus:outline-none"
                style={{ background: '#f5f4f8', border: '1px solid #6366f1', color: '#1e1d2e' }} />
              <button onClick={saveSavings} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>✓</button>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold mb-1" style={{ color: '#0d9488' }}>{formatCurrency(data.savingsBalance ?? 0)}</p>
              <button onClick={() => { setSavingsInput(String(data.savingsBalance ?? 0)); setEditingSavings(true) }}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: '#f0eff8', border: '1px solid #d5d4e8', color: '#8a89a8' }}>
                Edit
              </button>
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: '#aeadcc' }}>manually tracked</p>
        </div>
      </div>

      {/* ── Year by Year ── */}
      {yearStats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#8a89a8' }}>Year by Year</h2>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {yearStats.map((ys) => (
              <button key={ys.year} onClick={() => setDrillYear(ys.year)}
                className="shrink-0 card card-glow p-4 text-left transition-all hover:shadow-md"
                style={{ width: 160, borderLeft: `3px solid ${ys.net >= 0 ? '#16a34a' : '#dc2626'}` }}>
                <p className="text-2xl font-bold mb-2" style={{ color: '#1e1d2e' }}>{ys.year}</p>
                <p className="text-xs mb-0.5" style={{ color: '#8a89a8' }}>Spent</p>
                <p className="text-lg font-bold" style={{ color: '#dc2626' }}>{formatCurrency(ys.expenses)}</p>
                <p className="text-xs mt-2" style={{ color: '#16a34a' }}>+{formatCurrency(ys.income)} in</p>
                <p className="text-xs" style={{ color: ys.net >= 0 ? '#16a34a' : '#dc2626' }}>
                  {ys.net >= 0 ? '+' : ''}{formatCurrency(ys.net)} net
                </p>
                <p className="text-xs mt-1.5" style={{ color: '#aeadcc' }}>{ys.txCount} expenses</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom panels (3:2 asymmetric) ── */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#3c3b58' }}>Top Spending Categories</h2>
          {Object.keys(monthStats.byCategory).length === 0 ? (
            <p className="text-sm" style={{ color: '#aeadcc' }}>No expenses for this month.</p>
          ) : (
            <ul className="space-y-3">
              {Object.entries(monthStats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, amt]) => {
                const goal = data.budgetGoals.find((g) => g.category === cat && g.month === activeMonth)
                const pct = goal ? Math.min((amt / goal.monthlyLimit) * 100, 100) : null
                const catObj = data.categories.find(c => c.name === cat)
                return (
                  <li key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        {catObj && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catObj.color }} />}
                        <span style={{ color: '#3c3b58' }}>{cat}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {goal && <span className="text-xs" style={{ color: '#aeadcc' }}>/ {formatCurrency(goal.monthlyLimit)}</span>}
                        <span className="font-medium" style={{ color: '#1e1d2e' }}>{formatCurrency(amt)}</span>
                      </div>
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

        <div className="col-span-2 card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#3c3b58' }}>Recent Transactions</h2>
          {recent.length === 0 ? (
            <p className="text-sm" style={{ color: '#aeadcc' }}>No transactions yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((t) => (
                <li key={t.id} className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
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

      {/* ── Year drill-down modal ── */}
      {drillYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(30,29,46,0.4)' }}
          onClick={() => setDrillYear(null)}>
          <div className="card card-glow w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #eae9f5' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#1e1d2e' }}>{drillYear}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#8a89a8' }}>{drillYearTxns.length} transactions</p>
              </div>
              {/* Year summary stats */}
              <div className="flex items-center gap-6 mr-4">
                {(() => {
                  const ys = yearStats.find(y => y.year === drillYear)
                  if (!ys) return null
                  return (
                    <>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#8a89a8' }}>Income</p>
                        <p className="font-bold text-sm" style={{ color: '#16a34a' }}>{formatCurrency(ys.income)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#8a89a8' }}>Spent</p>
                        <p className="font-bold text-sm" style={{ color: '#dc2626' }}>{formatCurrency(ys.expenses)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#8a89a8' }}>Net</p>
                        <p className="font-bold text-sm" style={{ color: ys.net >= 0 ? '#16a34a' : '#dc2626' }}>
                          {ys.net >= 0 ? '+' : ''}{formatCurrency(ys.net)}
                        </p>
                      </div>
                    </>
                  )
                })()}
              </div>
              <button onClick={() => setDrillYear(null)}
                className="text-xl font-light w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: '#8a89a8', background: '#f0eff8' }}>×</button>
            </div>
            {/* Transaction list */}
            <div className="overflow-y-auto flex-1">
              {drillYearTxns.map((t, i) => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-3"
                  style={{ borderBottom: i < drillYearTxns.length - 1 ? '1px solid #f0eff5' : 'none' }}>
                  <span className="text-xs w-20 shrink-0" style={{ color: '#aeadcc' }}>{formatDate(t.date)}</span>
                  <span className="text-sm flex-1 truncate" style={{ color: '#1e1d2e' }}>{t.description}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${colors[t.category] ?? '#aeadcc'}18`, color: colors[t.category] ?? '#8a89a8' }}>
                    {t.category}
                  </span>
                  <span className="text-sm font-semibold shrink-0 w-24 text-right"
                    style={{ color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
