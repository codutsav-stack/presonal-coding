import { Link, useLocation } from 'react-router'
import { Search, Plus, Sun, Moon, Menu, ChevronRight, Bell, Command, LogOut, UserRound } from 'lucide-react'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { logout } from '@netlify/identity'
import { toast } from 'sonner'
import { useWorkspace } from '../../hooks/useWorkspace'
import { labels, kinds } from '../../types'
import { isReviewDue, localDateKey } from '../../lib/utils'
import { navigation } from './Sidebar'

export function Header({ onSearch, onMobile }: { onSearch: () => void; onMobile: () => void }) {
  const { user, add, setAuthOpen, preferences, changePreferences, entries } = useWorkspace()
  const location = useLocation()
  const root = `/${location.pathname.split('/')[1]}`
  const section = navigation.find(item => item.path === (root === '/' ? '/' : root))?.label || 'Settings'
  const due = entries.filter(entry => (entry.kind === 'task' && entry.status !== 'Completed' && entry.data.dueDate && String(entry.data.dueDate) <= localDateKey()) || isReviewDue(entry))
  return <header className="app-header"><div className="breadcrumbs"><button className="icon-button mobile-menu" onClick={onMobile} aria-label="Open navigation"><Menu size={20} /></button><span className="breadcrumb-workspace">Workspace</span><ChevronRight size={13} /><Link to={root}>{section}</Link>{location.pathname.split('/').length > 2 && <><ChevronRight size={13} /><span>Details</span></>}</div>
    <div className="header-actions"><button className="search-trigger" onClick={onSearch}><Search size={15} /><span>Search anything…</span><kbd><Command size={10} />K</kbd></button><button className="icon-button theme-button" aria-label="Toggle color theme" onClick={() => void changePreferences({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' }).catch(error => toast.error(error.message))}>{preferences.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
    <Dropdown.Root><Dropdown.Trigger asChild><button className="icon-button notifications-button" aria-label={`Notifications: ${due.length} items due`}><Bell size={18} />{due.length > 0 && <span className="notification-dot" />}</button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content className="dropdown-menu notification-menu" align="end" sideOffset={12}><div className="dropdown-title">On your radar</div>{due.length ? due.slice(0, 6).map(entry => <Dropdown.Item asChild key={entry.id}><Link to={`${entry.kind === 'task' ? '/tasks' : '/questions'}/${entry.id}`}>{entry.title}<span className="muted">Due</span></Link></Dropdown.Item>) : <p className="muted">All clear. No tasks or reviews due today.</p>}</Dropdown.Content></Dropdown.Portal></Dropdown.Root>
    <div className="header-divider" /><Dropdown.Root><Dropdown.Trigger asChild><button className="button primary quick-add"><Plus size={16} /><span>Quick add</span></button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content className="dropdown-menu" align="end" sideOffset={8}>{kinds.map(kind => <Dropdown.Item key={kind} onSelect={() => add(kind)}><Plus size={15} />Add {labels[kind].toLowerCase()}</Dropdown.Item>)}</Dropdown.Content></Dropdown.Portal></Dropdown.Root>
    <Dropdown.Root><Dropdown.Trigger asChild><button className="header-avatar" aria-label="Account menu">{user?.name?.[0]?.toUpperCase() || <UserRound size={15} />}</button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content className="dropdown-menu" align="end" sideOffset={8}>{user ? <><div className="dropdown-title">{user.name || 'Your account'}</div><Dropdown.Item asChild><Link to="/settings"><UserRound size={15} />Account settings</Link></Dropdown.Item><Dropdown.Item onSelect={() => { void logout().catch(() => toast.error('Unable to sign out')) }}><LogOut size={15} />Sign out</Dropdown.Item></> : <Dropdown.Item onSelect={() => setAuthOpen(true)}><UserRound size={15} />Sign in / Create account</Dropdown.Item>}</Dropdown.Content></Dropdown.Portal></Dropdown.Root>
    </div></header>
}
