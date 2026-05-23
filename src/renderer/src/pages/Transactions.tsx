import { useState } from 'react'
import { Transaction } from '../types'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, formatDate } from '../utils/data'

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

export default function Transactions({ store }: Props) {
  const { data, addTransaction, updateTransaction, deleteTransaction } = store
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState('')

  const sorted = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(
      (t) =>
        !filter ||
        t.description.toLowerCase().includes(filter.toLowerCase()) ||
        t.category.toLowerCase().includes(filter.toLowerCase())
    )

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setForm({ date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category, notes: t.notes ?? '' })
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      updateTransaction(editing.id, form)
    } else {
      addTransaction(form)
    }
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Add Transaction
        </button>
      </div>

      <input
        type="text"
        placeholder="Search transactions..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full mb-4 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-gray-500 text-sm p-6">No transactions found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-gray-100">{t.description}</td>
                  <td className="px-4 py-3 text-gray-400">{t.category}</td>
                  <td className={`px-4 py-3 text-right font-medium ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-white text-xs">Edit</button>
                    <button onClick={() => deleteTransaction(t.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">{editing ? 'Edit Transaction' : 'Add Transaction'}</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Date</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Description</label>
              <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Amount ($)</label>
                <input type="number" required min="0.01" step="0.01" value={form.amount || ''}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Select...</option>
                  {data.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium">
                {editing ? 'Save Changes' : 'Add Transaction'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 rounded-lg text-sm font-medium">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
