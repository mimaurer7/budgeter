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
      <p className="text-sm mb-6" style={{ color: '#8a89a8' }}>
        Upload your bank's CSV export. Duplicate transactions are automatically skipped.
      </p>

      {importResult && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
          Imported {importResult.imported} transaction{importResult.imported !== 1 ? 's' : ''}.
          {importResult.dupes > 0 && (
            <span className="ml-1" style={{ color: '#8a89a8' }}>({importResult.dupes} duplicates skipped)</span>
          )}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm"
          style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <button onClick={handlePickFile} className="btn-primary px-4 py-2 text-sm">
        Choose CSV File
      </button>

      {preview.length > 0 && (
        <div className="mt-6 card card-glow overflow-hidden">
          <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid #eae9f5' }}>
            <div>
              <span className="text-sm font-medium" style={{ color: '#1e1d2e' }}>{preview.length} new transactions</span>
              {skipped > 0 && (
                <span className="text-xs ml-2" style={{ color: '#aeadcc' }}>({skipped} duplicates/blank rows skipped)</span>
              )}
            </div>
            <button onClick={handleImport}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#16a34a' }}>
              Import All
            </button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead style={{ borderBottom: '1px solid #eae9f5' }}>
                <tr className="text-left" style={{ color: '#8a89a8' }}>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0eff5' }}>
                    <td className="px-4 py-2" style={{ color: '#8a89a8' }}>{formatDate(r.date)}</td>
                    <td className="px-4 py-2" style={{ color: '#1e1d2e' }}>{r.description}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          background: r.type === 'income' ? '#f0fdf4' : '#fef2f2',
                          color: r.type === 'income' ? '#16a34a' : '#dc2626'
                        }}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium"
                      style={{ color: r.type === 'income' ? '#16a34a' : '#dc2626' }}>
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
