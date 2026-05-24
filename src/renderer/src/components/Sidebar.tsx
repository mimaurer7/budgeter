import { Page } from '../types'
import { SaveStatus } from '../store/useAppStore'

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '▦' },
  { id: 'transactions', label: 'Transactions', icon: '↕' },
  { id: 'budget',       label: 'Budget',       icon: '◎' },
  { id: 'charts',       label: 'Charts',       icon: '◈' },
  { id: 'import',       label: 'Import CSV',   icon: '⬆' }
]

interface Props {
  activePage: Page
  onNavigate: (page: Page) => void
  saveStatus: SaveStatus
  onSave: () => void
}

export default function Sidebar({ activePage, onNavigate, saveStatus, onSave }: Props) {
  const statusColor = saveStatus === 'saved' ? '#16a34a' : saveStatus === 'saving' ? '#8a89a8' : '#dc2626'
  const statusIcon  = saveStatus === 'saved' ? '✓' : saveStatus === 'saving' ? '●' : '⚠'
  const statusLabel = saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Not saved'

  return (
    <nav className="w-56 flex flex-col shrink-0"
      style={{ background: 'linear-gradient(180deg, #f0eeff 0%, #eae8f8 100%)', borderRight: '1px solid #d8d6f0' }}>
      {/* Brand */}
      <div className="px-5 py-6 mb-2">
        <span className="text-lg font-bold tracking-tight"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Budgeter
        </span>
        <p className="text-xs mt-0.5" style={{ color: '#9a99c0' }}>Personal Finance</p>
      </div>

      {/* Nav */}
      <ul className="space-y-0.5 px-3 flex-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium nav-item ${activePage === item.id ? 'nav-active' : ''}`}
              style={{ color: activePage === item.id ? '#4f46e5' : '#6a6888' }}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #e0ddf5' }}>
        <p className="text-xs mb-3" style={{ color: '#c0bed8' }}>v0.1.0 · Local</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: statusColor }}>{statusIcon}</span>
            <span className="text-xs" style={{ color: statusColor }}>{statusLabel}</span>
          </div>
          <button
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className="text-xs px-2.5 py-1 rounded-lg transition-colors"
            style={{
              background: '#eae8f8',
              border: '1px solid #d5d4e8',
              color: saveStatus === 'saving' ? '#aeadcc' : '#6366f1',
              cursor: saveStatus === 'saving' ? 'default' : 'pointer'
            }}>
            Save
          </button>
        </div>
      </div>
    </nav>
  )
}
