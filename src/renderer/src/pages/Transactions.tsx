import { useMemo, useState } from 'react'
import { Transaction } from '../types'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, normalizeDate, monthKey } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

const EMPTY_FORM: Omit<Transaction, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  description: '',
  amount: 0,
  type: 'expense',
  category: '',
  notes: '',
  recurring: false,
}

function shortDate(dateStr: string): { top: string; bottom: string } {
  const d = new Date(normalizeDate(dateStr) + 'T00:00:00')
  if (isNaN(d.getTime())) return { top: dateStr, bottom: '' }
  return {
    top: d.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
    bottom: String(d.getFullYear())
  }
}

const inputCls = "w-full px-3 py-2 text-sm rounded-xl focus:outline-none"
const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
const labelCls = "text-xs font-medium mb-1 block"
const labelStyle = { color: 'var(--text-muted)' }

export default function Transactions({ store }: Props) {
  const { data, addTransaction, updateTransaction, deleteTransaction } = store
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')

  const activeFilterCount = [filterMonth, filterCategory, filterType !== 'all', filter].filter(Boolean).length

  const sorted = useMemo(() =>
    [...data.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((t) => {
        if (filterMonth && monthKey(t.date) !== filterMonth) return false
        if (filterCategory && t.category !== filterCategory) return false
        if (filterType !== 'all' && t.type !== filterType) return false
        if (filter && !t.description.toLowerCase().includes(filter.toLowerCase()) && !t.category.toLowerCase().includes(filter.toLowerCase())) return false
        return true
      }),
    [data.transactions, filter, filterMonth, filterCategory, filterType]
  )

  const runningBalances = useMemo(() => {
    if (sorted.length === 0) return []
    const reversed = [...sorted].reverse()
    const balances: number[] = []
    let running = 0
    for (const t of reversed) {
      if (t.type === 'income') running += t.amount
      else running -= t.amount
      balances.push(running)
    }
    return balances.reverse()
  }, [sorted])

  const savingsCatNames = useMemo(() =>
    new Set(data.categories.filter(c => c.savings).map(c => c.name)),
    [data.categories]
  )

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(t: Transaction) {
    setEditing(t)
    setForm({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category, notes: t.notes ?? '', recurring: t.recurring ?? false })
    setShowForm(true)
  }
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    editing ? updateTransaction(editing.id, form) : addTransaction(form)
    setShowForm(false)
  }

  function handleExportCSV() {
    const rows = [
      ['Date', 'Description', 'Category', 'Amount', 'Type', 'Notes', 'Recurring'].join(','),
      ...sorted.map((t) => [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.category,
        t.amount.toFixed(2),
        t.type,
        `"${(t.notes ?? '').replace(/"/g, '""')}"`,
        t.recurring ? 'yes' : 'no',
      ].join(','))
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const catColor = (name: string) => data.categories.find(c => c.name === name)?.color ?? '#8a89a8'
  const hasNotes = sorted.some(t => t.notes && t.notes.trim())

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm">
          + Add Transaction
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <input type="text" placeholder="Search by description or category..."
          value={filter} onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />

        <div className="flex gap-2 flex-wrap items-center">
          {/* Month filter */}
          <div className="flex items-center gap-1">
            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl focus:outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: filterMonth ? 'var(--text-primary)' : 'var(--text-very-muted)' }} />
            {filterMonth && (
              <button onClick={() => setFilterMonth('')}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-sm"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-muted)' }}>×</button>
            )}
          </div>

          {/* Category filter */}
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: filterCategory ? 'var(--text-primary)' : 'var(--text-very-muted)' }}>
            <option value="">All Categories</option>
            {[...data.categories]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          {/* Type filter */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['all', 'income', 'expense'] as const).map((opt, idx) => (
              <button key={opt} onClick={() => setFilterType(opt)}
                className="px-3 py-2 text-xs font-medium"
                style={{
                  background: filterType === opt ? '#6366f1' : 'var(--bg-input)',
                  color: filterType === opt ? '#fff' : 'var(--text-muted)',
                  borderRight: idx < 2 ? '1px solid var(--border)' : 'none'
                }}>
                {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilter(''); setFilterMonth(''); setFilterCategory(''); setFilterType('all') }}
              className="px-3 py-2 text-xs rounded-xl font-medium"
              style={{ color: '#6366f1', background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              Clear all
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-very-muted)' }}>
              {sorted.length} transaction{sorted.length !== 1 ? 's' : ''}
            </span>
            {sorted.length > 0 && (
              <button onClick={handleExportCSV}
                className="text-xs px-3 py-2 rounded-xl font-medium"
                style={{ color: '#6366f1', background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card card-glow overflow-hidden">
        {sorted.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: 'var(--text-very-muted)' }}>No transactions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--border-light)' }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <th className="px-4 py-3 w-24">Date</th>
                <th className="px-4 py-3">Description</th>
                {hasNotes && <th className="px-4 py-3 w-40">Notes</th>}
                <th className="px-4 py-3 w-36">Category</th>
                <th className="px-4 py-3 w-28 text-right">Running</th>
                <th className="px-4 py-3 w-32 text-right">Amount</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => {
                const { top, bottom } = shortDate(t.date)
                const runningBal = runningBalances[i]
                return (
                  <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border-row)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-3 w-24">
                      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{top}</p>
                      <p className="text-xs" style={{ color: 'var(--text-very-muted)' }}>{bottom}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        {t.recurring && <span className="text-xs" style={{ color: '#6366f1' }} title="Recurring">↺</span>}
                        <p className="truncate" style={{ color: 'var(--text-primary)' }}>{t.description}</p>
                      </div>
                    </td>
                    {hasNotes && (
                      <td className="px-4 py-3 w-40">
                        <p className="text-xs truncate" style={{ color: 'var(--text-very-muted)' }}>{t.notes ?? ''}</p>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
                        style={{ background: `${catColor(t.category)}18`, color: catColor(t.category) }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor(t.category) }} />
                        {t.category || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-medium" style={{ color: runningBal >= 0 ? '#16a34a' : '#dc2626' }}>
                        {runningBal >= 0 ? '+' : ''}{formatCurrency(runningBal)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold"
                      style={{ color: t.type === 'income' ? '#16a34a' : savingsCatNames.has(t.category) ? '#0d9488' : '#dc2626' }}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(t)} className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--text-primary)')}
                          onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}>Edit</button>
                        <button onClick={() => deleteTransaction(t.id)} className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ color: 'var(--text-very-muted)' }}
                          onMouseEnter={e => ((e.target as HTMLElement).style.color = '#dc2626')}
                          onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--text-very-muted)')}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'var(--overlay-bg)' }}>
          <form onSubmit={handleSubmit} className="card card-glow p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={labelStyle}>Date</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Type</label>
                <select value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
                  className={inputCls} style={inputStyle}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>Description</label>
              <input type="text" required value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls} style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={labelStyle}>Amount ($)</label>
                <input type="number" required min="0.01" step="0.01" value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>Category</label>
                <select value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls} style={inputStyle}>
                  <option value="">Select...</option>
                  {data.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>Notes (optional)</label>
              <input type="text" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputCls} style={inputStyle} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="recurring-check" checked={form.recurring ?? false}
                onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                className="w-4 h-4 rounded" style={{ accentColor: '#6366f1' }} />
              <label htmlFor="recurring-check" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Recurring transaction
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 py-2.5 text-sm">
                {editing ? 'Save Changes' : 'Add Transaction'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm rounded-xl font-medium"
                style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
