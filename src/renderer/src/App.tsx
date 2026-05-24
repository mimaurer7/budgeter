import { useState } from 'react'
import { Page } from './types'
import { useAppStore } from './store/useAppStore'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budget from './pages/Budget'
import Charts from './pages/Charts'
import Import from './pages/Import'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const store = useAppStore()

  if (store.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f5f4f1', color: '#1e1d2e' }}>
      <Sidebar activePage={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && <Dashboard store={store} />}
        {page === 'transactions' && <Transactions store={store} />}
        {page === 'budget' && <Budget store={store} />}
        {page === 'charts' && <Charts store={store} />}
        {page === 'import' && <Import store={store} />}
      </main>
    </div>
  )
}
