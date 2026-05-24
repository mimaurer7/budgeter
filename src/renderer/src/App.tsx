import { useState } from 'react'
import { Page } from './types'
import { useAppStore } from './store/useAppStore'
import { useTheme } from './store/useTheme'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budget from './pages/Budget'
import Charts from './pages/Charts'
import Import from './pages/Import'
import NetWorth from './pages/NetWorth'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const store = useAppStore()
  const { theme, toggleTheme } = useTheme()

  if (store.loading) {
    return (
      <div className="flex h-screen items-center justify-center"
        style={{ background: 'var(--bg-page)', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden"
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        saveStatus={store.saveStatus}
        onSave={store.manualSave}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard'    && <Dashboard store={store} />}
        {page === 'transactions' && <Transactions store={store} />}
        {page === 'budget'       && <Budget store={store} />}
        {page === 'charts'       && <Charts store={store} theme={theme} />}
        {page === 'import'       && <Import store={store} />}
        {page === 'networth'     && <NetWorth store={store} />}
      </main>
    </div>
  )
}
