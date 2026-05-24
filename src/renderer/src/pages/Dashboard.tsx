import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, currentMonth, formatDate, monthKey } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

export default function Dashboard({ store }: Props) {
  const { data } = store

  const mostRecentMonth = useMemo(() => {
    if (data.transactions.length === 0) return currentMonth()
    return data.transactions
      .map((t) => monthKey(t.date))
      .sort()
      .at(-1)!
  }, [data.transactions])

  const [month, setMonth] = useState<string | null>(null)
  const activeMonth = month ?? mostRecentMonth

  const stats = useMemo(() => {
    const monthTxns = data.transactions.filter((t) => monthKey(t.date) === activeMonth)
    const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const net = income - expenses

    const byCategory: Record<string, number> = {}
    monthTxns
      .filter((t) => t.type === 'expense')
      .forEach((t) => { byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount })

    const recent = [...data.transactions]
      .sort((a, b) => monthKey(b.date).localeCompare(monthKey(a.date)) || b.date.localeCompare(a.date))
      .slice(0, 5)

    const allTimeIncome = data.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const allTimeExpenses = data.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    return { income, expenses, net, byCategory, recent, allTimeIncome, allTimeExpenses }
  }, [data, activeMonth])

  const monthLabel = new Date(activeMonth + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-gray-400 text-sm">{monthLabel}</p>
        </div>
        <input
          type="month"
          value={activeMonth}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Income" value={formatCurrency(stats.income)} color="text-green-400" />
        <StatCard label="Expenses" value={formatCurrency(stats.expenses)} color="text-red-400" />
        <StatCard
          label="Net"
          value={formatCurrency(stats.net)}
          color={stats.net >= 0 ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="All-Time Earned" value={formatCurrency(stats.allTimeIncome)} color="text-green-400" sub={`${data.transactions.filter(t => t.type === 'income').length} deposits`} />
        <StatCard label="All-Time Spent" value={formatCurrency(stats.allTimeExpenses)} color="text-red-400" sub={`${data.transactions.filter(t => t.type === 'expense').length} transactions`} />
        <StatCard label="Net Savings" value={formatCurrency(stats.allTimeIncome - stats.allTimeExpenses)} color={(stats.allTimeIncome - stats.allTimeExpenses) >= 0 ? 'text-green-400' : 'text-red-400'} sub="all time" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold mb-4 text-gray-200">Top Spending Categories</h2>
          {Object.keys(stats.byCategory).length === 0 ? (
            <p className="text-gray-500 text-sm">No expenses for this month.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, amt]) => {
                  const goal = data.budgetGoals.find((g) => g.category === cat && g.month === activeMonth)
                  const pct = goal ? Math.min((amt / goal.monthlyLimit) * 100, 100) : null
                  return (
                    <li key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{cat}</span>
                        <span className="text-gray-400">{formatCurrency(amt)}</span>
                      </div>
                      {pct !== null && (
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>
          )}
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="font-semibold mb-4 text-gray-200">Recent Transactions</h2>
          {stats.recent.length === 0 ? (
            <p className="text-gray-500 text-sm">No transactions yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recent.map((t) => (
                <li key={t.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-gray-200">{t.description}</p>
                    <p className="text-gray-500 text-xs">{formatDate(t.date)} · {t.category}</p>
                  </div>
                  <span className={t.type === 'income' ? 'text-green-400' : 'text-red-400'}>
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

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}
