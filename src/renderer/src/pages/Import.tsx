import { useState } from 'react'
import { Transaction } from '../types'
import { useAppStore } from '../store/useAppStore'
import { parseCSV, formatCurrency, formatDate, normalizeDate, guessCategory } from '../utils/data'

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

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0
  return parseFloat(raw.replace(/[$,\s]/g, '')) || 0
}

function txKey(date: string, description: string, amount: number): string {
  return `${date}|${description.toLowerCase().trim()}|${amount.toFixed(2)}`
}

export default function Import({ store }: Props) {
  const { data, importTransactions } = store
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; dupes: number } | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState('')

  async function handlePickFile() {
    setError('')
    setPreview([])
    setImportResult(null)

    const csv = await window.api.openCsvDialog()
    if (!csv) return

    try {
      const rows = parseCSV(csv)
      if (rows.length === 0) { setError('CSV appears empty.'); return }

      const parsed: ParsedRow[] = []
      let skippedCount = 0

      for (const row of rows) {
        const date = normalizeDate(row['Date']?.trim() ?? '')
        const description = row['Description']?.trim() ?? ''
        const debit = parseAmount(row['Debit'])
        const credit = parseAmount(row['Credit'])

        if (!date || !description) { skippedCount++; continue }

        if (credit > 0) {
          parsed.push({ date, description, amount: credit, type: 'income', category: guessCategory(description) })
        } else if (debit !== 0) {
          parsed.push({ date, description, amount: Math.abs(debit), type: 'expense', category: guessCategory(description) })
        } else {
          skippedCount++
        }
      }

      if (parsed.length === 0) {
        setError('No transactions found. Make sure this is the right CSV file.')
        return
      }

      // Deduplicate against existing transactions
      const existingKeys = new Set(
        data.transactions.map((t) => txKey(t.date, t.description, t.amount))
      )
      const unique = parsed.filter((r) => !existingKeys.has(txKey(r.date, r.description, r.amount)))
      const dupeCount = parsed.length - unique.length

      setPreview(unique)
      setSkipped(skippedCount)

      if (unique.length === 0) {
        setError(`All ${parsed.length} transactions already exist — nothing new to import.`)
      } else if (dupeCount > 0) {
        setSkipped(skippedCount + dupeCount)
      }
    } catch {
      setError('Failed to read the file. Make sure it is a valid CSV.')
    }
  }

  function handleImport() {
    const toImport: Omit<Transaction, 'id'>[] = preview.map((r) => ({ ...r, notes: '' }))
    importTransactions(toImport)
    setImportResult({ imported: preview.length, dupes: skipped })
    setPreview([])
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Import CSV</h1>
      <p className="text-gray-400 text-sm mb-6">
        Upload your bank's CSV export. Duplicate transactions are automatically skipped.
      </p>

      {importResult && (
        <div className="mb-4 bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-green-400 text-sm">
          Imported {importResult.imported} transaction{importResult.imported !== 1 ? 's' : ''}.
          {importResult.dupes > 0 && (
            <span className="text-gray-400 ml-1">({importResult.dupes} duplicates skipped)</span>
          )}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handlePickFile}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
      >
        Choose CSV File
      </button>

      {preview.length > 0 && (
        <div className="mt-6 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
            <div>
              <span className="text-sm font-medium">{preview.length} new transactions</span>
              {skipped > 0 && (
                <span className="text-xs text-gray-500 ml-2">({skipped} duplicates/blank rows skipped)</span>
              )}
            </div>
            <button
              onClick={handleImport}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Import All
            </button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
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
                  <tr key={i} className="border-b border-gray-800 last:border-0">
                    <td className="px-4 py-2 text-gray-400">{formatDate(r.date)}</td>
                    <td className="px-4 py-2 text-gray-200">{r.description}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full ${r.type === 'income' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${r.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
