import { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, ReferenceLine
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, currentMonth, monthKey, formatDate } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

const CHART_STYLE = { backgroundColor: '#fff', border: '1px solid #eae9f5', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#3c3b58' }
const AXIS_STYLE = { fill: '#aeadcc', fontSize: 11 }
const GRID_COLOR = '#eae9f5'
const CURSOR_STYLE = { fill: 'rgba(99,102,241,0.05)' }

export default function Charts({ store }: Props) {
  const { data } = store
  const [month, setMonth] = useState(currentMonth())
  const [drillMonth, setDrillMonth] = useState<string | null>(null)
  const [drillMerchant, setDrillMerchant] = useState<string | null>(null)

  const transferCats = useMemo(() =>
    new Set(data.categories.filter((c) => c.transfer).map((c) => c.name)),
    [data.categories]
  )

  const pieData = useMemo(() => {
    const byCategory: Record<string, number> = {}
    data.transactions
      .filter((t) => t.type === 'expense' && monthKey(t.date) === month && !transferCats.has(t.category))
      .forEach((t) => { byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount })
    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data, month, transferCats])

  const budgetBarData = useMemo(() => {
    const goals = data.budgetGoals.filter((g) => g.month === month)
    if (goals.length === 0) return []
    const spendByCategory: Record<string, number> = {}
    data.transactions
      .filter((t) => t.type === 'expense' && monthKey(t.date) === month && !transferCats.has(t.category))
      .forEach((t) => { spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + t.amount })
    return goals.map((g) => ({
      category: g.category,
      Budget: g.monthlyLimit,
      Spent: spendByCategory[g.category] ?? 0
    }))
  }, [data, month, transferCats])

  const trendData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {}
    data.transactions
      .filter((t) => !transferCats.has(t.category))
      .forEach((t) => {
        const m = monthKey(t.date)
        if (!months[m]) months[m] = { income: 0, expenses: 0 }
        if (t.type === 'income') months[m].income += t.amount
        else months[m].expenses += t.amount
      })
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([m, v]) => ({
        month: m,
        Income: v.income,
        Expenses: v.expenses,
        'Savings Rate': v.income > 0 ? Math.round(((v.income - v.expenses) / v.income) * 100) : 0
      }))
  }, [data, transferCats])

  const topMerchants = useMemo(() => {
    const byDesc: Record<string, number> = {}
    data.transactions
      .filter((t) => t.type === 'expense' && monthKey(t.date) === month && !transferCats.has(t.category))
      .forEach((t) => { byDesc[t.description] = (byDesc[t.description] ?? 0) + t.amount })
    return Object.entries(byDesc)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  }, [data, month, transferCats])

  // Drill-down: all transactions for a selected month
  const drillMonthTxns = useMemo(() => {
    if (!drillMonth) return []
    return [...data.transactions]
      .filter((t) => monthKey(t.date) === drillMonth)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.transactions, drillMonth])

  // Drill-down: all-time transactions for a selected merchant, grouped by year
  const drillMerchantTxns = useMemo(() => {
    if (!drillMerchant) return []
    return [...data.transactions]
      .filter((t) => t.description === drillMerchant && t.type === 'expense')
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.transactions, drillMerchant])

  const drillMerchantByYear = useMemo(() => {
    const grouped: Record<string, typeof drillMerchantTxns> = {}
    drillMerchantTxns.forEach((t) => {
      const yr = t.date.slice(0, 4)
      if (!grouped[yr]) grouped[yr] = []
      grouped[yr].push(t)
    })
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]))
  }, [drillMerchantTxns])

  const colors = data.categories.reduce<Record<string, string>>((acc, c) => {
    acc[c.name] = c.color; return acc
  }, {})

  const totalSpend = pieData.reduce((s, d) => s + d.value, 0)

  const drillMonthLabel = drillMonth
    ? new Date(drillMonth + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Charts</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{ background: '#f5f4f8', border: '1px solid #d5d4e8', color: '#3c3b58' }} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#3c3b58' }}>Spending by Category</h2>
          {pieData.length === 0 ? (
            <p className="text-sm" style={{ color: '#aeadcc' }}>No expense data for this month.</p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={colors[entry.name] ?? '#aeadcc'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrency(v), name]}
                    contentStyle={CHART_STYLE}
                    labelStyle={{ color: '#8a89a8' }}
                    itemStyle={{ color: '#3c3b58' }}
                    cursor={CURSOR_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-1.5">
                {pieData.map((entry) => (
                  <li key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[entry.name] ?? '#aeadcc' }} />
                      <span style={{ color: '#5a5978' }}>{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: '#aeadcc' }}>{((entry.value / totalSpend) * 100).toFixed(0)}%</span>
                      <span className="font-medium" style={{ color: '#3c3b58' }}>{formatCurrency(entry.value)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Budget vs Actual */}
        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#3c3b58' }}>Budget vs Actual</h2>
          {budgetBarData.length === 0 ? (
            <p className="text-sm" style={{ color: '#aeadcc' }}>Set budget goals to see this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={budgetBarData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="category" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} contentStyle={CHART_STYLE} itemStyle={{ color: '#3c3b58' }} cursor={CURSOR_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#8a89a8' }} />
                <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Trend line */}
      <div className="card card-glow p-5">
        <h2 className="font-semibold mb-4" style={{ color: '#3c3b58' }}>Income vs Expenses (Last 6 Months)</h2>
        {trendData.length === 0 ? (
          <p className="text-sm" style={{ color: '#aeadcc' }}>No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" tick={AXIS_STYLE} />
              <YAxis tick={AXIS_STYLE} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name]} contentStyle={CHART_STYLE} itemStyle={{ color: '#3c3b58' }} cursor={CURSOR_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8a89a8' }} />
              <Line type="monotone" dataKey="Income" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke="#dc2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Monthly savings rate — click a bar to drill in */}
        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-1" style={{ color: '#3c3b58' }}>Monthly Savings Rate</h2>
          <p className="text-xs mb-4" style={{ color: '#aeadcc' }}>% of income kept · click a bar to see that month's transactions</p>
          {trendData.length === 0 ? (
            <p className="text-sm" style={{ color: '#aeadcc' }}>No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                onClick={(d) => { if (d?.activePayload?.[0]) setDrillMonth(d.activePayload[0].payload.month) }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="month" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Savings Rate']} contentStyle={CHART_STYLE} itemStyle={{ color: '#3c3b58' }} cursor={CURSOR_STYLE} />
                <ReferenceLine y={0} stroke="#d5d4e8" strokeDasharray="4 4" />
                <Bar dataKey="Savings Rate" radius={[4, 4, 0, 0]} style={{ cursor: 'pointer' }}>
                  {trendData.map((entry, i) => (
                    <Cell key={i} fill={entry['Savings Rate'] < 0 ? '#dc2626' : entry['Savings Rate'] < 10 ? '#d97706' : '#0d9488'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top merchants — click to drill into all-time */}
        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-1" style={{ color: '#3c3b58' }}>Top Merchants</h2>
          <p className="text-xs mb-4" style={{ color: '#aeadcc' }}>Biggest payees this month · click to see all-time history</p>
          {topMerchants.length === 0 ? (
            <p className="text-sm" style={{ color: '#aeadcc' }}>No expense data for this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topMerchants} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}
                onClick={(d) => { if (d?.activePayload?.[0]) setDrillMerchant(d.activePayload[0].payload.name) }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
                <XAxis type="number" tick={AXIS_STYLE} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={AXIS_STYLE} width={110}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '…' : v} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Amount']} contentStyle={CHART_STYLE} itemStyle={{ color: '#3c3b58' }} cursor={CURSOR_STYLE} />
                <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Drill-down: month transactions ── */}
      {drillMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(30,29,46,0.4)' }}
          onClick={() => setDrillMonth(null)}>
          <div className="card card-glow w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #eae9f5' }}>
              <div>
                <h2 className="font-semibold text-lg" style={{ color: '#1e1d2e' }}>{drillMonthLabel}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#8a89a8' }}>{drillMonthTxns.length} transactions</p>
              </div>
              <div className="flex items-center gap-6 text-sm mr-6">
                {(['income', 'expense'] as const).map((type) => {
                  const total = drillMonthTxns.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0)
                  return (
                    <div key={type} className="text-right">
                      <p className="text-xs uppercase tracking-wide" style={{ color: '#8a89a8' }}>{type === 'income' ? 'Income' : 'Expenses'}</p>
                      <p className="font-bold" style={{ color: type === 'income' ? '#16a34a' : '#dc2626' }}>{formatCurrency(total)}</p>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setDrillMonth(null)}
                className="text-xl font-light w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: '#8a89a8', background: '#f0eff8' }}>×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {drillMonthTxns.map((t, i) => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-3"
                  style={{ borderBottom: i < drillMonthTxns.length - 1 ? '1px solid #f0eff5' : 'none' }}>
                  <span className="text-xs w-16 shrink-0" style={{ color: '#aeadcc' }}>{formatDate(t.date)}</span>
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

      {/* ── Drill-down: merchant all-time ── */}
      {drillMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(30,29,46,0.4)' }}
          onClick={() => setDrillMerchant(null)}>
          <div className="card card-glow w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #eae9f5' }}>
              <div>
                <h2 className="font-semibold text-lg truncate max-w-sm" style={{ color: '#1e1d2e' }}>{drillMerchant}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#8a89a8' }}>
                  {drillMerchantTxns.length} transactions · {formatCurrency(drillMerchantTxns.reduce((s, t) => s + t.amount, 0))} all time
                </p>
              </div>
              <button onClick={() => setDrillMerchant(null)}
                className="text-xl font-light w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: '#8a89a8', background: '#f0eff8' }}>×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {drillMerchantByYear.map(([year, txns], yi) => {
                const yearTotal = txns.reduce((s, t) => s + t.amount, 0)
                return (
                  <div key={year}>
                    {/* Year header */}
                    <div className="flex items-center justify-between px-6 py-2 sticky top-0"
                      style={{ background: '#f5f4f8', borderBottom: '1px solid #eae9f5', borderTop: yi > 0 ? '1px solid #eae9f5' : 'none' }}>
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6366f1' }}>{year}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: '#aeadcc' }}>{txns.length} visit{txns.length !== 1 ? 's' : ''}</span>
                        <span className="text-sm font-bold" style={{ color: '#dc2626' }}>{formatCurrency(yearTotal)}</span>
                      </div>
                    </div>
                    {/* Transactions for this year */}
                    {txns.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-4 px-6 py-2.5"
                        style={{ borderBottom: i < txns.length - 1 ? '1px solid #f0eff5' : 'none' }}>
                        <span className="text-xs w-20 shrink-0" style={{ color: '#aeadcc' }}>{formatDate(t.date)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: `${colors[t.category] ?? '#aeadcc'}18`, color: colors[t.category] ?? '#8a89a8' }}>
                          {t.category}
                        </span>
                        <span className="text-sm font-semibold ml-auto shrink-0" style={{ color: '#dc2626' }}>
                          -{formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
