import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router'
import { MotionConfig } from 'motion/react'
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { CommandPalette } from './components/CommandPalette'
import { EntryEditor } from './components/EntryEditor'
import { AuthDialog } from './components/AuthDialog'
import { Dashboard } from './pages/Dashboard'
import { Library } from './pages/Library'
import { EmptyState } from './components/ui/EmptyState'
import { useWorkspace } from './hooks/useWorkspace'
import { kinds, paths } from './types'

const EntryDetail = lazy(() => import('./pages/EntryDetail').then(module => ({ default: module.EntryDetail })))
const Learning = lazy(() => import('./pages/Learning').then(module => ({ default: module.Learning })))
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })))

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const { motionDisabled, error, refresh, loading, user } = useWorkspace()
  const location = useLocation()
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(current => !current) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => { window.scrollTo({ top: 0 }); setMobileOpen(false) }, [location.pathname])
  return <MotionConfig reducedMotion={motionDisabled ? 'always' : 'user'}><a className="skip-link" href="#main-content">Skip to main content</a><div className={`app-shell ${collapsed ? 'sidebar-is-collapsed' : ''}`}><Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} /><div className="workspace-main"><Header onSearch={() => setCommandOpen(true)} onMobile={() => setMobileOpen(true)} /><main id="main-content">{error && <div className="workspace-error" role="alert"><AlertCircle size={17} /><span>{error} Retry to load your latest saved changes.</span><button onClick={() => void refresh()}><RefreshCw size={13} />Retry</button></div>}{loading && user ? <div className="page-content loading-state" aria-label="Loading workspace"><div className="skeleton skeleton-heading" /><div className="skeleton skeleton-hero" /><div className="stats-grid">{Array.from({ length: 4 }, (_, index) => <div className="skeleton skeleton-stat" key={index} />)}</div><div className="skeleton skeleton-collection" /></div> : <Suspense fallback={<div className="page-content"><div className="skeleton detail-skeleton" aria-label="Loading page" /></div>}><Routes><Route path="/" element={<Dashboard />} />{kinds.map(kind => <Route key={kind} path={paths[kind]} element={<Library key={kind} kind={kind} />} />)}{kinds.map(kind => <Route key={`${kind}-detail`} path={`${paths[kind]}/:id`} element={<EntryDetail />} />)}<Route path="/learning" element={<Learning />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<div className="page-content"><EmptyState title="A little outside your universe." description="This page doesn’t exist. Let’s find your way back." /><Link className="button secondary" to="/"><ArrowLeft size={16} />Back to dashboard</Link></div>} /></Routes></Suspense>}</main></div></div><CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} /><EntryEditor /><AuthDialog /></MotionConfig>
}
