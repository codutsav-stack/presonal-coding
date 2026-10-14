import { NavLink, useNavigate } from 'react-router'
import { Code2, LayoutDashboard, FolderKanban, Braces, BookOpen, Link2, ListChecks, ChartNoAxesCombined, Settings2, ChevronsUpDown, Plus, ArrowUpRight, PanelLeftClose, Sparkles, X } from 'lucide-react'
import { useWorkspace } from '../../hooks/useWorkspace'

export const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: FolderKanban },
  { label: 'DSA & Questions', path: '/questions', icon: Braces },
  { label: 'Notes', path: '/notes', icon: BookOpen },
  { label: 'Resources', path: '/resources', icon: Link2 },
  { label: 'Tasks', path: '/tasks', icon: ListChecks },
  { label: 'Learning Progress', path: '/learning', icon: ChartNoAxesCombined },
]
export function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: { collapsed: boolean; onCollapse: () => void; mobileOpen: boolean; onMobileClose: () => void }) {
  const { user, entries, add, setAuthOpen } = useWorkspace()
  const navigate = useNavigate()
  const projects = entries.filter(entry => entry.kind === 'project')
  return <><button className={`mobile-backdrop ${mobileOpen ? 'visible' : ''}`} onClick={onMobileClose} aria-label="Close navigation" /><aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
    <NavLink to="/" className="brand" onClick={onMobileClose}><span className="brand-icon"><Code2 size={23} /></span><span>DevVault<span className="brand-dot">.</span></span><span className="brand-beta">BETA</span></NavLink>
    <button className="mobile-nav-close icon-button" onClick={onMobileClose} aria-label="Close navigation"><X size={20} /></button>
    <button className="workspace-switch" onClick={() => { if (!user) setAuthOpen(true); else { navigate('/settings'); onMobileClose() } }}><span className="workspace-avatar">{user?.name?.[0]?.toUpperCase() || 'D'}</span><span className="workspace-switch-copy"><strong>Personal workspace</strong><small>{user ? 'Your developer universe' : 'A space to make things'}</small></span><ChevronsUpDown size={14} /></button>
    <div className="nav-heading">WORKSPACE</div>
    <nav aria-label="Main navigation">{navigation.map(item => <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={onMobileClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={collapsed ? item.label : undefined}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{item.path === '/projects' && projects.length > 0 && <small>{projects.length}</small>}</NavLink>)}</nav>
    <div className="sidebar-divider" /><div className="nav-heading favorites-heading"><span>PINNED PROJECTS</span><button className="icon-button" onClick={() => add('project')} aria-label="Add pinned project"><Plus size={14} /></button></div>
    <div className="sidebar-pins">{projects.filter(entry => entry.pinned).slice(0, 4).map((entry, index) => <NavLink to={`/projects/${entry.id}`} key={entry.id} onClick={onMobileClose}><span className={`pin-dot color-${index % 4}`} />{entry.title}</NavLink>)}{!projects.some(entry => entry.pinned) && <p>Your favorite builds,<br />always within reach.</p>}</div>
    <div className="sidebar-bottom"><div className="sidebar-callout"><span className="callout-icon"><Sparkles size={17} /></span><strong>A little better, every day.</strong><p>Big things start with small steps.<br />Keep building your universe.</p><NavLink to="/learning" onClick={onMobileClose}>Explore your progress<ArrowUpRight size={14} /></NavLink></div>
    <NavLink to="/settings" onClick={onMobileClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Settings2 size={18} /><span>Settings</span></NavLink>
    <div className="sidebar-profile"><button className="profile-button" onClick={() => { if (user) { navigate('/settings'); onMobileClose() } else setAuthOpen(true) }}><span className="profile-avatar">{user?.name?.[0]?.toUpperCase() || 'DV'}</span><span><strong>{user?.name || 'Your workspace'}</strong><small>{user ? 'Personal account' : 'Sign in to sync'}</small></span></button><button className="icon-button collapse-button" onClick={onCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><PanelLeftClose size={17} /></button></div></div>
  </aside></>
}
