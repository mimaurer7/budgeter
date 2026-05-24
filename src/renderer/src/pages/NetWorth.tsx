import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { formatCurrency, monthKey } from '../utils/data'

interface Props {
  store: ReturnType<typeof useAppStore>
}

function EditableBalance({
  label, value, color, onSave
}: { label: string; value: number; color: string; onSave: (n: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')

  function commit() {
    const val = parseFloat(input.replace(/[$,]/g, ''))
    if (!isNaN(val) && val >= 0) onSave(val)
    setEditing(false)
  }

  return (
    <div className="card card-glow p-5">
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--text-muted)' }}>$</span>
          <input type="number" value={input} min="0" step="0.01" autoFocus
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 px-2 py-1 text-sm rounded-lg focus:outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid #6366f1', color: 'var(--text-primary)' }} />
          <button onClick={commit} className="text-xs px-2 py-1 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>✓</button>
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold mb-1" style={{ color }}>{formatCurrency(value)}</p>
          <button onClick={() => { setInput(String(value)); setEditing(true) }}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Edit
          </button>
        </div>
      )}
      <p className="text-xs mt-2" style={{ color: 'var(--text-very-muted)' }}>manually tracked</p>
    </div>
  )
}

export default function NetWorth({ store }: Props) {
  const { data, setSavingsBalance, setDebtBalance } = store

  const savings = data.savingsBalance ?? 0
  const debt = data.debtBalance ?? 0
  const netWorth = savings - debt

  const transferCats = useMemo(() =>
    new Set(data.categories.filter((c) => c.transfer).map((c) => c.name)),
    [data.categories]
  )

  const savingsCats = useMemo(() =>
    new Set(data.categories.filter((c) => c.savings).map((c) => c.name)),
    [data.categories]
  )

  // Monthly net cash flow (income - expenses - savings) for last 12 months
  const cashFlowData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number; saved: number }> = {}
    data.transactions.forEach((t) => {
      if (transferCats.has(t.category)) return
      const m = monthKey(t.date)
      if (!months[m]) months[m] = { income: 0, expenses: 0, saved: 0 }
      if (t.type === 'income') months[m].income += t.amount
      else if (savingsCats.has(t.category)) months[m].saved += t.amount
      else months[m].expenses += t.amount
    })
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([m, v]) => ({
        month: m,
        Net: Math.round(v.income - v.expenses - v.saved),
        Income: Math.round(v.income),
        Expenses: Math.round(v.expenses + v.saved),
      }))
  }, [data.transactions, transferCats, savingsCats])

  const CHART_STYLE = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 10, padding: '8px 12px', fontSize: 12,
    color: 'var(--text-secondary)'
  }
  const AXIS_STYLE = { fill: 'var(--text-very-muted)', fontSize: 11 }
  const GRID_COLOR = 'var(--border-light)'

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Net Worth</h1>

      {/* Big net worth number */}
      <div className="card card-glow p-8 text-center"
        style={{ borderTop: `3px solid ${netWorth >= 0 ? '#0d9488' : '#dc2626'}` }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
          Current Net Worth
        </p>
        <p className="text-5xl font-bold mb-1" style={{ color: netWorth >= 0 ? '#0d9488' : '#dc2626' }}>
          {netWorth >= 0 ? '' : '-'}{formatCurrency(Math.abs(netWorth))}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-very-muted)' }}>
          Savings − Debt
        </p>
      </div>

      {/* Savings / Debt / Net cards */}
      <div className="grid grid-cols-3 gap-4">
        <EditableBalance label="Savings Balance" value={savings} color="#0d9488" onSave={setSavingsBalance} />
        <EditableBalance label="Debt Balance" value={debt} color="#dc2626" onSave={setDebtBalance} />
        <div className="card card-glow p-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Breakdown</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Savings</span>
                <span style={{ color: '#0d9488' }}>{formatCurrency(savings)}</span>
              </div>
              {(savings + debt) > 0 && (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((savings / (savings + debt)) * 100, 100)}%`, background: '#0d9488' }} />
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Debt</span>
                <span style={{ color: '#dc2626' }}>{formatCurrency(debt)}</span>
              </div>
              {(savings + debt) > 0 && (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((debt / (savings + debt)) * 100, 100)}%`, background: '#dc2626' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly cash flow chart */}
      <div className="card card-glow p-5">
        <h2 className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Monthly Cash Flow (Last 12 Months)</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-very-muted)' }}>Income minus expenses and savings — positive months add to net worth</p>
        {cashFlowData.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-very-muted)' }}>No transaction data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cashFlowData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="month" tick={AXIS_STYLE} />
              <YAxis tick={AXIS_STYLE} tickFormatter={(v) => `$${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
                contentStyle={CHART_STYLE}
                itemStyle={{ color: 'var(--text-secondary)' }}
                cursor={{ fill: 'rgba(99,102,241,0.05)' }}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
              <Bar dataKey="Net" radius={[4, 4, 0, 0]}>
                {cashFlowData.map((entry, i) => (
                  <rect key={i} fill={entry.Net >= 0 ? '#0d9488' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Income vs Expenses summary table */}
      {cashFlowData.length > 0 && (
        <div className="card card-glow overflow-hidden">
          <div className="grid px-5 py-3 text-xs font-semibold uppercase tracking-wide"
            style={{ gridTemplateColumns: '1fr 140px 140px 120px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
            <span>Month</span>
            <span className="text-right">Income</span>
            <span className="text-right">Expenses</span>
            <span className="text-right">Net</span>
          </div>
          {[...cashFlowData].reverse().map((row, i) => (
            <div key={row.month} className="grid px-5 py-3 text-sm"
              style={{
                gridTemplateColumns: '1fr 140px 140px 120px',
                borderBottom: i < cashFlowData.length - 1 ? '1px solid var(--border-row)' : 'none'
              }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {new Date(row.month + '-02').toLocaleString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <span className="text-right" style={{ color: '#16a34a' }}>{formatCurrency(row.Income)}</span>
              <span className="text-right" style={{ color: '#dc2626' }}>{formatCurrency(row.Expenses)}</span>
              <span className="text-right font-semibold" style={{ color: row.Net >= 0 ? '#0d9488' : '#dc2626' }}>
                {row.Net >= 0 ? '+' : ''}{formatCurrency(row.Net)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
