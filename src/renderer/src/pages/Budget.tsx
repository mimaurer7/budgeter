import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, currentMonth } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

export default function Budget({ store }: Props) {
  const { data, upsertBudgetGoal, deleteBudgetGoal } = store
  const [month, setMonth] = useState(currentMonth())
  const [editCat, setEditCat] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState('')

  const monthTxns = data.transactions.filter((t) => t.date.startsWith(month) && t.type === 'expense')
  const spendByCategory: Record<string, number> = {}
  monthTxns.forEach((t) => {
    spendByCategory[t.category] = (spendByCategory[t.category] ?? 0) + t.amount
  })

  const goals = data.budgetGoals.filter((g) => g.month === month)
  const goalMap: Record<string, number> = {}
  goals.forEach((g) => { goalMap[g.category] = g.monthlyLimit })

  const allCategories = Array.from(
    new Set([...Object.keys(spendByCategory), ...Object.keys(goalMap)])
  ).sort()

  function startEdit(cat: string) {
    setEditCat(cat)
    setLimitInput(String(goalMap[cat] ?? ''))
  }

  function saveGoal(cat: string) {
    const limit = parseFloat(limitInput)
    if (!isNaN(limit) && limit > 0) {
      upsertBudgetGoal({ category: cat, month, monthlyLimit: limit })
    }
    setEditCat(null)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Budget Goals</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
      </div>

      {allCategories.length === 0 && (
        <p className="text-gray-500 text-sm">
          No spending data yet. Add transactions to see budget tracking, or click a category to set a goal.
        </p>
      )}

      <div className="space-y-3">
        {data.categories.map((cat) => {
          const spent = spendByCategory[cat.name] ?? 0
          const limit = goalMap[cat.name]
          const pct = limit ? Math.min((spent / limit) * 100, 100) : null
          const hasActivity = spent > 0 || limit != null

          if (!hasActivity) return null

          return (
            <div key={cat.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-sm">{cat.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">
                    {formatCurrency(spent)} {limit ? `/ ${formatCurrency(limit)}` : ''}
                  </span>
                  {editCat === cat.name ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-400 text-xs">Limit $</span>
                      <input
                        type="number" min="1" step="1" value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveGoal(cat.name)}
                        autoFocus
                        className="w-24 bg-gray-800 border border-indigo-500 rounded px-2 py-1 text-xs focus:outline-none"
                      />
                      <button onClick={() => saveGoal(cat.name)} className="text-indigo-400 hover:text-indigo-300 text-xs">Save</button>
                      <button onClick={() => setEditCat(null)} className="text-gray-500 hover:text-gray-300 text-xs">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(cat.name)} className="text-gray-400 hover:text-white text-xs">
                        {limit ? 'Edit goal' : 'Set goal'}
                      </button>
                      {limit && (
                        <button onClick={() => deleteBudgetGoal(goals.find((g) => g.category === cat.name)!.id)}
                          className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {pct !== null && (
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Set goals for other categories</h2>
        <div className="grid grid-cols-3 gap-2">
          {data.categories
            .filter((c) => !spendByCategory[c.name] && !goalMap[c.name])
            .map((c) => (
              <button key={c.id} onClick={() => startEdit(c.name)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-400 hover:border-gray-600 hover:text-gray-200 transition-colors">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
