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

  const transferCats = useMemo(() =>
    new Set(data.categories.filter((c) => c.transfer).map((c) => c.name)),
    [data.categories]
  )

  const savingsCats = useMemo(() =>
    new Set(data.categories.filter((c) => c.savings).map((c) => c.name)),
    [data.categories]
  )

  const monthStats = useMemo(() => {
    const txns = data.transactions.filter((t) =>
      monthKey(t.date) === activeMonth && !transferCats.has(t.category))
    const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = txns.filter((t) => t.type === 'expense' && !savingsCats.has(t.category)).reduce((s, t) => s + t.amount, 0)
    const saved = txns.filter((t) => t.type === 'expense' && savingsCats.has(t.category)).reduce((s, t) => s + t.amount, 0)
    const byCategory: Record<string, number> = {}
    txns.filter((t) => t.type === 'expense' && !savingsCats.has(t.category)).forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
    })
    return { income, expenses, saved, net: income - expenses - saved, byCategory }
  }, [data.transactions, activeMonth, transferCats, savingsCats])

  const allTime = useMemo(() => {
    const real = data.transactions.filter((t) => !transferCats.has(t.category))
    const income = real.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = real.filter((t) => t.type === 'expense' && !savingsCats.has(t.category)).reduce((s, t) => s + t.amount, 0)
    const saved = real.filter((t) => t.type === 'expense' && savingsCats.has(t.category)).reduce((s, t) => s + t.amount, 0)
    const expenseCount = real.filter((t) => t.type === 'expense' && !savingsCats.has(t.category)).length
    const incomeCount = real.filter((t) => t.type === 'income').length
    return { income, expenses, saved, net: income - expenses - saved, expenseCount, incomeCount }
  }, [data.transactions, transferCats, savingsCats])

  const yearStats = useMemo(() => {
    const map: Record<string, { income: number; expenses: number; saved: number; txCount: number }> = {}
    data.transactions
      .filter((t) => !transferCats.has(t.category))
      .forEach((t) => {
        const yr = t.date.slice(0, 4)
        if (!map[yr]) map[yr] = { income: 0, expenses: 0, saved: 0, txCount: 0 }
        if (t.type === 'income') map[yr].income += t.amount
        else if (savingsCats.has(t.category)) map[yr].saved += t.amount
        else { map[yr].expenses += t.amount; map[yr].txCount++ }
      })
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, v]) => ({ year, ...v, net: v.income - v.expenses - v.saved }))
  }, [data.transactions, transferCats, savingsCats])

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
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{monthLabel}</p>
        </div>
        <input type="month" value={activeMonth} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} />
      </div>

      {/* ── Monthly snapshot ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Income" value={formatCurrency(monthStats.income)} color="#16a34a" accent="stat-income" />
        <StatCard label="Spent" value={formatCurrency(monthStats.expenses)} color="#dc2626" accent="stat-expense" />
        <StatCard label="Saved" value={formatCurrency(monthStats.saved)} color="#0d9488" accent="stat-neutral"
          sub={monthStats.income > 0 ? `${Math.round((monthStats.saved / monthStats.income) * 100)}% of income` : undefined} />
        <StatCard label="Left to Assign" value={formatCurrency(monthStats.net)}
          color={monthStats.net < 0 ? '#dc2626' : monthStats.net === 0 ? '#16a34a' : '#d97706'} accent="stat-net"
          sub={monthStats.net === 0 ? 'Every dollar has a job!' : monthStats.net < 0 ? 'Over budget' : 'Unallocated'} />
      </div>

      {/* ── All-time summary + savings ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card card-glow p-6">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>All-Time Overview</p>
            {earliestDate && <span className="text-xs" style={{ color: 'var(--text-very-muted)' }}>since {earliestDate}</span>}
          </div>
          <div className="grid grid-cols-4 gap-4 mt-3">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Earned</p>
              <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>{formatCurrency(allTime.income)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-very-muted)' }}>{allTime.incomeCount} deposits</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Spent</p>
              <p className="text-2xl font-bold" style={{ color: '#dc2626' }}>{formatCurrency(allTime.expenses)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-very-muted)' }}>{allTime.expenseCount} transactions</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total Saved</p>
              <p className="text-2xl font-bold" style={{ color: '#0d9488' }}>{formatCurrency(allTime.saved)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-very-muted)' }}>across all time</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Net</p>
              <p className="text-2xl font-bold" style={{ color: allTime.net >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(allTime.net)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-very-muted)' }}>unallocated</p>
            </div>
          </div>
        </div>

        <div className="card card-glow stat-neutral p-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Savings Balance</p>
          {editingSavings ? (
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--text-muted)' }}>$</span>
              <input type="number" value={savingsInput} min="0" step="0.01" autoFocus
                onChange={(e) => setSavingsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveSavings(); if (e.key === 'Escape') setEditingSavings(false) }}
                className="flex-1 px-2 py-1 text-sm rounded-lg focus:outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid #6366f1', color: 'var(--text-primary)' }} />
              <button onClick={saveSavings} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>✓</button>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold mb-1" style={{ color: '#0d9488' }}>{formatCurrency(data.savingsBalance ?? 0)}</p>
              <button onClick={() => { setSavingsInput(String(data.savingsBalance ?? 0)); setEditingSavings(true) }}
                className="text-xs px-2 py-1 rounded-lg"
                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Edit
              </button>
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--text-very-muted)' }}>manually tracked</p>
        </div>
      </div>

      {/* ── Year by Year ── */}
      {yearStats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Year by Year</h2>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {yearStats.map((ys) => (
              <button key={ys.year} onClick={() => setDrillYear(ys.year)}
                className="shrink-0 card card-glow p-4 text-left transition-all hover:shadow-md"
                style={{ width: 160, borderLeft: `3px solid ${ys.net >= 0 ? '#16a34a' : '#dc2626'}` }}>
                <p className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{ys.year}</p>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Spent</p>
                <p className="text-lg font-bold" style={{ color: '#dc2626' }}>{formatCurrency(ys.expenses)}</p>
                {ys.saved > 0 && (
                  <>
                    <p className="text-xs mt-1 mb-0.5" style={{ color: 'var(--text-muted)' }}>Saved</p>
                    <p className="text-sm font-semibold" style={{ color: '#0d9488' }}>{formatCurrency(ys.saved)}</p>
                  </>
                )}
                <p className="text-xs mt-2" style={{ color: '#16a34a' }}>+{formatCurrency(ys.income)} in</p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-very-muted)' }}>{ys.txCount} expenses</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom panels ── */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Top Spending Categories</h2>
          {Object.keys(monthStats.byCategory).length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-very-muted)' }}>No expenses for this month.</p>
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
                        <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {goal && <span className="text-xs" style={{ color: 'var(--text-very-muted)' }}>/ {formatCurrency(goal.monthlyLimit)}</span>}
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(amt)}</span>
                      </div>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
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
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Recent Transactions</h2>
          {recent.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-very-muted)' }}>No transactions yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((t) => (
                <li key={t.id} className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{t.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-very-muted)' }}>{formatDate(t.date)} · {t.category}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay-bg)' }}
          onClick={() => setDrillYear(null)}>
          <div className="card card-glow w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{drillYear}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{drillYearTxns.length} transactions</p>
              </div>
              <div className="flex items-center gap-6 mr-4">
                {(() => {
                  const ys = yearStats.find(y => y.year === drillYear)
                  if (!ys) return null
                  return (
                    <>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Income</p>
                        <p className="font-bold text-sm" style={{ color: '#16a34a' }}>{formatCurrency(ys.income)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Spent</p>
                        <p className="font-bold text-sm" style={{ color: '#dc2626' }}>{formatCurrency(ys.expenses)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved</p>
                        <p className="font-bold text-sm" style={{ color: '#0d9488' }}>{formatCurrency(ys.saved)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Net</p>
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
                style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {drillYearTxns.map((t, i) => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-3"
                  style={{ borderBottom: i < drillYearTxns.length - 1 ? '1px solid var(--border-row)' : 'none' }}>
                  <span className="text-xs w-20 shrink-0" style={{ color: 'var(--text-very-muted)' }}>{formatDate(t.date)}</span>
                  <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{t.description}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${colors[t.category] ?? '#aeadcc'}18`, color: colors[t.category] ?? 'var(--text-muted)' }}>
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
      <p className="text-xs mb-1.5 font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className={`font-bold ${small ? 'text-lg' : 'text-2xl'}`} style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-very-muted)' }}>{sub}</p>}
    </div>
  )
}
