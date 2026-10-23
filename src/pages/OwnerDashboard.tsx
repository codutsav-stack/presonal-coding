import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { 
  ShieldCheck, 
  Users, 
  FolderKanban, 
  Braces, 
  BookOpen, 
  Layers, 
  RefreshCw, 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  UserCheck, 
  AlertTriangle,
  Clock,
  Sparkles,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { useWorkspace } from '../hooks/useWorkspace'
import { 
  fetchOwnerMetrics, 
  updateUserRoleByOwner, 
  isSupabaseConfigured, 
  configuredOwnerEmail,
  type OwnerMetrics 
} from '../lib/supabase'
import { EmptyState } from '../components/ui/EmptyState'
import { relativeDate } from '../lib/utils'

export function OwnerDashboard() {
  const { user, loading: authLoading, setAuthOpen, add } = useWorkspace()
  const [metrics, setMetrics] = useState<OwnerMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      if (!isSupabaseConfigured()) {
        setMetrics(null)
        return
      }
      const data = await fetchOwnerMetrics()
      setMetrics(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load owner data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user && user.role === 'owner') {
      void loadData()
    } else {
      setLoading(false)
    }
  }, [user?.id, user?.role])

  const handleRoleToggle = async (targetUser: OwnerMetrics['users'][number]) => {
    const nextRole: 'owner' | 'user' = targetUser.role === 'owner' ? 'user' : 'owner'
    if (targetUser.id === user?.id && nextRole === 'user') {
      toast.error('You cannot revoke your own owner status from the web dashboard.')
      return
    }
    setActionBusy(targetUser.id)
    try {
      await updateUserRoleByOwner(targetUser.id, nextRole)
      toast.success(`Updated ${targetUser.name || 'user'} to ${nextRole}`)
      await loadData(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Role update failed')
    } finally {
      setActionBusy(null)
    }
  }

  if (authLoading || (loading && !metrics)) {
    return (
      <div className="page-content loading-state" aria-label="Authenticating">
        <div className="skeleton skeleton-heading" />
        <div className="stats-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="skeleton skeleton-stat" key={i} />
          ))}
        </div>
      </div>
    )
  }

  // Not signed in
  if (!user) {
    return (
      <div className="page-content owner-restricted-page">
        <div className="page-intro">
          <div>
            <div className="eyebrow"><Lock size={12} /> OWNER RESTRICTED AREA</div>
            <h1>Owner Access Required<span className="heading-dot">.</span></h1>
            <p>This administrative command center is reserved for the site owner.</p>
          </div>
        </div>
        <div className="panel" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 540, margin: '2rem auto' }}>
          <div className="auth-logo" style={{ margin: '0 auto 1.5rem', width: 56, height: 56, borderRadius: '50%', background: 'var(--violet-surface)', display: 'grid', placeItems: 'center', color: 'var(--violet-bright)' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Authentication Required</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Please sign in with your configured owner credentials to access system management, platform statistics, and database administration.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="button primary" onClick={() => setAuthOpen(true)}>
              <ShieldCheck size={16} />
              Sign in as Owner
            </button>
            <Link to="/" className="button secondary">
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Signed in but not owner
  if (user.role !== 'owner') {
    return (
      <div className="page-content owner-restricted-page">
        <div className="page-intro">
          <div>
            <div className="eyebrow"><AlertTriangle size={12} /> PERMISSION DENIED</div>
            <h1>Standard Developer Account<span className="heading-dot">.</span></h1>
            <p>Access to the Owner Command Center is restricted.</p>
          </div>
        </div>
        <div className="panel" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: 560, margin: '2rem auto' }}>
          <div style={{ margin: '0 auto 1.5rem', width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', display: 'grid', placeItems: 'center', color: '#f87171' }}>
            <Lock size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>403 Forbidden</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            You are signed in as <strong>{user.email || user.name}</strong>, which currently holds the <code>user</code> role.
            Normal accounts cannot view administrative data or manage other accounts.
          </p>
          <div style={{ background: 'var(--bg-card-subtle)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Owner Provisioning:</div>
            To promote this account to owner, run the secure administrative CLI script on your server:
            <code style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem', background: 'var(--bg-app)', borderRadius: '4px', color: 'var(--violet-bright)' }}>
              npm run setup:owner {user.email || 'your-email@domain.com'}
            </code>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/" className="button primary">
              <ArrowLeft size={16} />
              Return to Workspace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content owner-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            <ShieldCheck size={12} />
            RESTRICTED · SYSTEM ADMINISTRATOR & OWNER
          </div>
          <h1>
            Owner Command Center<span className="heading-dot">.</span>
          </h1>
          <p>Complete administrative visibility, user directory, and database health.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="button secondary small" 
            onClick={() => void loadData(true)} 
            disabled={refreshing}
            title="Refresh database statistics"
          >
            <RefreshCw size={14} className={refreshing ? 'rotate' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh Data'}
          </button>
          <button className="button primary small" onClick={() => add('project')}>
            <Plus size={14} />
            New Project
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <section className="panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.75rem', borderLeft: '3px solid var(--violet-bright)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'var(--violet-surface)', display: 'grid', placeItems: 'center', color: 'var(--violet-bright)' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>
              Authenticated as Owner: <span style={{ color: 'var(--violet-bright)' }}>{user.name}</span> ({user.email})
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Row Level Security Active · Configured Owner Email: <code>{configuredOwnerEmail || 'Auto-Provisioned'}</code>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="tag" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
            <CheckCircle2 size={12} style={{ marginRight: 4, display: 'inline' }} />
            RLS Enforced
          </span>
          <span className="tag" style={{ background: 'var(--violet-surface)', color: 'var(--violet-bright)', borderColor: 'var(--violet-border)' }}>
            <Sparkles size={12} style={{ marginRight: 4, display: 'inline' }} />
            Owner Privileges Active
          </span>
        </div>
      </section>

      {/* Metrics Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-top">
            <span>Total Registered Users</span>
            <span className="stat-icon violet"><Users size={17} /></span>
          </div>
          <strong>{metrics ? metrics.totalUsers.toString().padStart(2, '0') : '--'}</strong>
          <div className="stat-bottom">
            <span>Platform accounts in profiles</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Total Projects</span>
            <span className="stat-icon blue"><FolderKanban size={17} /></span>
          </div>
          <strong>{metrics ? metrics.totalProjects.toString().padStart(2, '0') : '--'}</strong>
          <div className="stat-bottom">
            <span>Across all categories</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>DSA Coding Solutions</span>
            <span className="stat-icon green"><Braces size={17} /></span>
          </div>
          <strong>{metrics ? metrics.totalQuestions.toString().padStart(2, '0') : '--'}</strong>
          <div className="stat-bottom">
            <span>Problems & algorithms</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Notes & Resources</span>
            <span className="stat-icon amber"><BookOpen size={17} /></span>
          </div>
          <strong>{metrics ? (metrics.totalNotes + metrics.totalResources).toString().padStart(2, '0') : '--'}</strong>
          <div className="stat-bottom">
            <span>{metrics?.totalNotes || 0} notes · {metrics?.totalResources || 0} resources</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: User Management & Recent System Activity */}
      <div className="dashboard-columns">
        <div className="dashboard-main-column">
          {/* User Directory Table */}
          <section className="panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="section-heading" style={{ marginBottom: '1.25rem' }}>
              <h2>
                <Users size={18} />
                User Directory & Role Authorization
                <span className="section-count">{metrics?.users.length || 0}</span>
              </h2>
            </div>
            {metrics?.users && metrics.users.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>User / Name</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Email Address</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Role</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>Registered</th>
                      <th style={{ padding: '0.75rem 0.5rem', fontWeight: 500, textAlign: 'right' }}>Authorization Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.users.map(u => {
                      const isCurrentUser = u.id === user.id
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              <span style={{ 
                                width: 28, 
                                height: 28, 
                                borderRadius: '50%', 
                                background: u.role === 'owner' ? 'var(--violet-surface)' : 'var(--bg-card-subtle)', 
                                color: u.role === 'owner' ? 'var(--violet-bright)' : 'var(--text-muted)',
                                display: 'grid', 
                                placeItems: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700 
                              }}>
                                {u.name ? u.name[0].toUpperCase() : 'U'}
                              </span>
                              <div>
                                <strong style={{ display: 'block', fontSize: '0.88rem' }}>{u.name}</strong>
                                {isCurrentUser && <small style={{ color: 'var(--violet-bright)' }}>(You)</small>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                            {u.email || 'No email registered'}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <span className={`tag ${u.role === 'owner' ? 'violet' : ''}`} style={{ textTransform: 'capitalize' }}>
                              {u.role === 'owner' ? <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} /> : null}
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            {relativeDate(u.createdAt)}
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                            {isCurrentUser ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Protected</span>
                            ) : (
                              <button
                                className={`button ${u.role === 'owner' ? 'secondary' : 'primary'} small`}
                                onClick={() => void handleRoleToggle(u)}
                                disabled={actionBusy === u.id}
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                              >
                                {actionBusy === u.id ? 'Updating…' : u.role === 'owner' ? 'Revoke Owner' : 'Make Owner'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState 
                compact 
                icon={Users} 
                title="No Users Loaded" 
                description="Connect your database to inspect platform users." 
              />
            )}
          </section>
        </div>

        {/* Side Column: Recent System Activities & Platform Configuration */}
        <div className="dashboard-side-column">
          <section className="panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="section-heading" style={{ marginBottom: '1rem' }}>
              <h2>
                <Clock size={17} />
                Recent System Activity
              </h2>
            </div>
            {metrics?.recentActivities && metrics.recentActivities.length > 0 ? (
              <div className="activity-list">
                {metrics.recentActivities.slice(0, 6).map(activity => (
                  <div className="activity-row" key={activity.id}>
                    <span className="activity-dot" />
                    <div>
                      <p>
                        {activity.action} <strong>{activity.title}</strong>
                      </p>
                      <span>{relativeDate(activity.createdAt)} · <em style={{ fontStyle: 'normal', color: 'var(--text-muted)' }}>{activity.kind}</em></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No recent activities recorded yet.</p>
            )}
          </section>

          <section className="panel" style={{ padding: '1.5rem' }}>
            <div className="section-heading" style={{ marginBottom: '0.75rem' }}>
              <h2>
                <Layers size={17} />
                Architecture & Security
              </h2>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Persistence Layer</strong>
                Supabase PostgreSQL with DDL migrations and normalized tagging.
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Row Level Security (RLS)</strong>
                Strict user isolation; owner is authorized via <code>is_owner()</code> security definer function.
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Owner CLI Provisioning</strong>
                Run <code>npm run setup:owner</code> with the service role key to manage owner access from server side.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
