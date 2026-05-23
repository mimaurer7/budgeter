import { Page } from '../types'

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'transactions', label: 'Transactions', icon: '↕' },
  { id: 'budget', label: 'Budget Goals', icon: '◎' },
  { id: 'charts', label: 'Charts', icon: '▦' },
  { id: 'import', label: 'Import CSV', icon: '⬆' }
]

interface Props {
  activePage: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ activePage, onNavigate }: Props) {
  return (
    <nav className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col py-6 shrink-0">
      <div className="px-5 mb-8">
        <span className="text-lg font-bold text-indigo-400 tracking-tight">Budgeter</span>
      </div>
      <ul className="space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePage === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
