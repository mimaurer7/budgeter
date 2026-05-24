import { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, currentMonth, monthKey } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

const CHART_STYLE = { backgroundColor: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: 10, padding: '8px 12px', fontSize: 12 }
const AXIS_STYLE = { fill: '#4a4a6a', fontSize: 11 }
const GRID_COLOR = '#1a1a2e'

export default function Charts({ store }: Props) {
  const { data } = store
  const [month, setMonth] = useState(currentMonth())

  const pieData = useMemo(() => {
    const byCategory: Record<string, number> = {}
    data.transactions
      .filter((t) => t.type === 'expense' && monthKey(t.date) === month)
      .forEach((t) => { byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount })
    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data, month])

  const budgetBarData = useMemo(() => {
    const goals = data.budgetGoals.filter((g) => g.month === month)
    if (goals.length === 0) return []
    const spendByCategory: Record<string, number> = {}
    data.transactions
      .filter((t) => t.type === 'expense' && monthKey(t.date) === month)
      .forEach((t) => { spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + t.amount })
    return goals.map((g) => ({
      category: g.category,
      Budget: g.monthlyLimit,
      Spent: spendByCategory[g.category] ?? 0
    }))
  }, [data, month])

  const trendData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {}
    data.transactions.forEach((t) => {
      const m = monthKey(t.date)
      if (!months[m]) months[m] = { income: 0, expenses: 0 }
      if (t.type === 'income') months[m].income += t.amount
      else months[m].expenses += t.amount
    })
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([m, v]) => ({ month: m, Income: v.income, Expenses: v.expenses }))
  }, [data])

  const colors = data.categories.reduce<Record<string, string>>((acc, c) => {
    acc[c.name] = c.color; return acc
  }, {})

  const totalSpend = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Charts</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl focus:outline-none"
          style={{ background: '#12121e', border: '1px solid #1e1e2e', color: '#a0a0c0' }} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pie chart — legend outside, no slice labels */}
        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#c0c0e0' }}>Spending by Category</h2>
          {pieData.length === 0 ? (
            <p className="text-sm" style={{ color: '#3a3a5a' }}>No expense data for this month.</p>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={85}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={colors[entry.name] ?? '#4a4a6a'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), '']}
                    contentStyle={CHART_STYLE}
                    labelStyle={{ color: '#a0a0c0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <ul className="mt-3 space-y-1.5">
                {pieData.map((entry) => (
                  <li key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[entry.name] ?? '#4a4a6a' }} />
                      <span style={{ color: '#a0a0c0' }}>{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span style={{ color: '#5a5a7a' }}>{((entry.value / totalSpend) * 100).toFixed(0)}%</span>
                      <span className="font-medium" style={{ color: '#c0c0e0' }}>{formatCurrency(entry.value)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Budget vs Actual */}
        <div className="card card-glow p-5">
          <h2 className="font-semibold mb-4" style={{ color: '#c0c0e0' }}>Budget vs Actual</h2>
          {budgetBarData.length === 0 ? (
            <p className="text-sm" style={{ color: '#3a3a5a' }}>Set budget goals to see this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={budgetBarData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="category" tick={AXIS_STYLE} />
                <YAxis tick={AXIS_STYLE} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={CHART_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#6a6a8a' }} />
                <Bar dataKey="Budget" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Trend line */}
      <div className="card card-glow p-5">
        <h2 className="font-semibold mb-4" style={{ color: '#c0c0e0' }}>Income vs Expenses (Last 6 Months)</h2>
        {trendData.length === 0 ? (
          <p className="text-sm" style={{ color: '#3a3a5a' }}>No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" tick={AXIS_STYLE} />
              <YAxis tick={AXIS_STYLE} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={CHART_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#6a6a8a' }} />
              <Line type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
