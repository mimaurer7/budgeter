import { useState } from 'react'
import { Transaction } from '../types'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, normalizeDate } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

const EMPTY_FORM: Omit<Transaction, 'id'> = {
  date: new Date().toISOString().slice(0, 10),
  description: '',
  amount: 0,
  type: 'expense',
  category: '',
  notes: ''
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
const inputStyle = { background: '#f5f4f8', border: '1px solid #d5d4e8', color: '#1e1d2e' }
const labelCls = "text-xs font-medium mb-1 block"
const labelStyle = { color: '#8a89a8' }

export default function Transactions({ store }: Props) {
  const { data, addTransaction, updateTransaction, deleteTransaction } = store
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('')

  const sorted = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((t) =>
      !filter ||
      t.description.toLowerCase().includes(filter.toLowerCase()) ||
      t.category.toLowerCase().includes(filter.toLowerCase())
    )

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(t: Transaction) {
    setEditing(t)
    setForm({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category, notes: t.notes ?? '' })
    setShowForm(true)
  }
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    editing ? updateTransaction(editing.id, form) : addTransaction(form)
    setShowForm(false)
  }

  const catColor = (name: string) => data.categories.find(c => c.name === name)?.color ?? '#8a89a8'
  const savingsCatNames = new Set(data.categories.filter(c => c.savings).map(c => c.name))

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm">
          + Add Transaction
        </button>
      </div>

      <input type="text" placeholder="Search by description or category..."
        value={filter} onChange={(e) => setFilter(e.target.value)}
        className="w-full mb-4 px-4 py-2.5 text-sm rounded-xl focus:outline-none"
        style={{ background: '#f5f4f8', border: '1px solid #d5d4e8', color: '#1e1d2e' }} />

      <div className="card card-glow overflow-hidden">
        {sorted.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: '#aeadcc' }}>No transactions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid #eae9f5' }}>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#8a89a8' }}>
                <th className="px-4 py-3 w-24">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 w-36">Category</th>
                <th className="px-4 py-3 w-32 text-right">Amount</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const { top, bottom } = shortDate(t.date)
                return (
                  <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid #f0eff5' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafaf8')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-3 w-24">
                      <p className="text-xs font-medium" style={{ color: '#3c3b58' }}>{top}</p>
                      <p className="text-xs" style={{ color: '#aeadcc' }}>{bottom}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate" style={{ color: '#1e1d2e' }}>{t.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
                        style={{ background: `${catColor(t.category)}18`, color: catColor(t.category) }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor(t.category) }} />
                        {t.category || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold"
                      style={{ color: t.type === 'income' ? '#16a34a' : savingsCatNames.has(t.category) ? '#0d9488' : '#dc2626' }}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(t)} className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ color: '#8a89a8' }}
                          onMouseEnter={e => ((e.target as HTMLElement).style.color = '#3c3b58')}
                          onMouseLeave={e => ((e.target as HTMLElement).style.color = '#8a89a8')}>Edit</button>
                        <button onClick={() => deleteTransaction(t.id)} className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ color: '#c0b0b0' }}
                          onMouseEnter={e => ((e.target as HTMLElement).style.color = '#dc2626')}
                          onMouseLeave={e => ((e.target as HTMLElement).style.color = '#c0b0b0')}>Delete</button>
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
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(30,29,46,0.4)' }}>
          <form onSubmit={handleSubmit} className="card card-glow p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold" style={{ color: '#1e1d2e' }}>{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>

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

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 py-2.5 text-sm">
                {editing ? 'Save Changes' : 'Add Transaction'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm rounded-xl font-medium"
                style={{ background: '#f0eff8', color: '#8a89a8', border: '1px solid #d5d4e8' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
