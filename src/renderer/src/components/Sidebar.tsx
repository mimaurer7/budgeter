import { Page } from '../types'

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
}

export default function Sidebar({ activePage, onNavigate }: Props) {
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
      <div className="px-5 py-4 text-xs" style={{ color: '#b0aed0', borderTop: '1px solid #e0ddf5' }}>
        v0.1.0 · Local
      </div>
    </nav>
  )
}
