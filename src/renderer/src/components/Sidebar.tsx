import { Page } from '../types'
import { SaveStatus } from '../store/useAppStore'
import { Theme } from '../store/useTheme'

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '▦' },
  { id: 'transactions', label: 'Transactions', icon: '↕' },
  { id: 'budget',       label: 'Budget',       icon: '◎' },
  { id: 'charts',       label: 'Charts',       icon: '◈' },
  { id: 'networth',     label: 'Net Worth',    icon: '◆' },
  { id: 'import',       label: 'Import CSV',   icon: '⬆' },
]

interface Props {
  activePage: Page
  onNavigate: (page: Page) => void
  saveStatus: SaveStatus
  onSave: () => void
  theme: Theme
  onToggleTheme: () => void
}

export default function Sidebar({ activePage, onNavigate, saveStatus, onSave, theme, onToggleTheme }: Props) {
  const statusColor = saveStatus === 'saved' ? '#16a34a' : saveStatus === 'saving' ? 'var(--text-muted)' : '#dc2626'
  const statusIcon  = saveStatus === 'saved' ? '✓' : saveStatus === 'saving' ? '●' : '⚠'
  const statusLabel = saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Not saved'

  return (
    <nav className="w-56 flex flex-col shrink-0"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}>
      {/* Brand */}
      <div className="px-5 py-6 mb-2">
        <span className="text-lg font-bold tracking-tight"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Budgeter
        </span>
        <p className="text-xs mt-0.5" style={{ color: 'var(--sidebar-text-muted)' }}>Personal Finance</p>
      </div>

      {/* Nav */}
      <ul className="space-y-0.5 px-3 flex-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium nav-item ${activePage === item.id ? 'nav-active' : ''}`}
              style={{ color: activePage === item.id ? '#4f46e5' : 'var(--text-muted)' }}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--sidebar-footer-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs" style={{ color: 'var(--sidebar-footer-muted)' }}>v0.1.0 · Local</p>
          <button onClick={onToggleTheme}
            className="text-sm px-2 py-1 rounded-lg transition-colors"
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
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
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              color: saveStatus === 'saving' ? 'var(--text-very-muted)' : '#6366f1',
              cursor: saveStatus === 'saving' ? 'default' : 'pointer'
            }}>
            Save
          </button>
        </div>
      </div>
    </nav>
  )
}
