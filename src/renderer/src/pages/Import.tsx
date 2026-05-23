import { useState } from 'react'
import { Transaction } from '../types'
import { useAppStore } from '../store/useAppStore'
import { parseCSV, generateId, formatCurrency } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

interface ParsedRow {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
}

export default function Import({ store }: Props) {
  const { data, importTransactions } = store
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [imported, setImported] = useState(false)
  const [error, setError] = useState('')

  // Field mapping state
  const [dateCol, setDateCol] = useState('Date')
  const [descCol, setDescCol] = useState('Description')
  const [amountCol, setAmountCol] = useState('Amount')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])

  async function handlePickFile() {
    setError('')
    setPreview([])
    setImported(false)
    const csv = await window.api.openCsvDialog()
    if (!csv) return
    try {
      const rows = parseCSV(csv)
      if (rows.length === 0) { setError('CSV appears empty.'); return }
      const cols = Object.keys(rows[0])
      setHeaders(cols)
      setRawRows(rows)
      // Auto-detect columns
      setDateCol(cols.find((c) => /date/i.test(c)) ?? cols[0])
      setDescCol(cols.find((c) => /desc|memo|name/i.test(c)) ?? cols[1])
      setAmountCol(cols.find((c) => /amount|debit|credit/i.test(c)) ?? cols[2])
    } catch {
      setError('Failed to parse CSV.')
    }
  }

  function buildPreview() {
    const rows = rawRows.map((row) => {
      const rawAmount = parseFloat(row[amountCol]?.replace(/[$,]/g, '') ?? '0')
      return {
        date: row[dateCol] ?? '',
        description: row[descCol] ?? '',
        amount: Math.abs(rawAmount),
        type: (rawAmount < 0 ? 'expense' : 'income') as 'income' | 'expense',
        category: 'Other'
      }
    }).filter((r) => r.date && r.description && r.amount > 0)
    setPreview(rows)
  }

  function handleImport() {
    const toImport: Omit<Transaction, 'id'>[] = preview.map((r) => ({
      ...r,
      id: generateId(),
      notes: ''
    }))
    importTransactions(toImport)
    setImported(true)
    setPreview([])
    setRawRows([])
    setHeaders([])
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Import CSV</h1>
      <p className="text-gray-400 text-sm mb-6">
        Import transactions from a bank CSV export. Map the columns to the correct fields, preview, then confirm.
      </p>

      {imported && (
        <div className="mb-4 bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-green-400 text-sm">
          Transactions imported successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button onClick={handlePickFile}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium mb-6">
        Choose CSV File
      </button>

      {headers.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
          <h2 className="font-semibold mb-4 text-gray-200">Map Columns</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Date column', value: dateCol, set: setDateCol },
              { label: 'Description column', value: descCol, set: setDescCol },
              { label: 'Amount column', value: amountCol, set: setAmountCol }
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                <select value={value} onChange={(e) => set(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button onClick={buildPreview}
            className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Preview Import
          </button>
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <span className="text-sm font-medium">{preview.length} transactions to import</span>
            <button onClick={handleImport}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Confirm Import
            </button>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                <tr className="text-gray-400 text-left">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="px-4 py-2 text-gray-400">{r.date}</td>
                    <td className="px-4 py-2 text-gray-200">{r.description}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.type === 'income' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right ${r.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 bg-gray-900/50 rounded-xl border border-gray-800 p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-2">CSV Format Tips</h3>
        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
          <li>Most banks export CSV from their website under "Download transactions" or similar</li>
          <li>Negative amounts are treated as expenses; positive as income</li>
          <li>Imported transactions default to the "Other" category — you can edit them after import</li>
          <li>Common column names are auto-detected (Date, Description, Amount)</li>
        </ul>
      </div>
    </div>
  )
}
