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
    acc[c.name] = c.color
    return acc
  }, {})

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Charts</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold mb-4 text-gray-200">Spending by Category</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-500 text-sm">No expense data for this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={colors[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold mb-4 text-gray-200">Budget vs Actual</h2>
          {budgetBarData.length === 0 ? (
            <p className="text-gray-500 text-sm">Set budget goals to see this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={budgetBarData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Budget" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="font-semibold mb-4 text-gray-200">Income vs Expenses (Last 6 Months)</h2>
        {trendData.length === 0 ? (
          <p className="text-gray-500 text-sm">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
