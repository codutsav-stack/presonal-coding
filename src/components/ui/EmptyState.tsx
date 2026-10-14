import { Plus, Orbit, type LucideIcon } from 'lucide-react'
export function EmptyState({ title, description, action, actionLabel = 'Create your first item', icon: Icon = Orbit, compact = false }: { title: string; description: string; action?: () => void; actionLabel?: string; icon?: LucideIcon; compact?: boolean }) {
  return <div className={`empty-state ${compact ? 'compact' : ''}`}><div className="empty-icon"><Icon size={24} strokeWidth={1.4} /></div><h3>{title}</h3><p>{description}</p>{action && <button className="button secondary small" onClick={action}><Plus size={15} />{actionLabel}</button>}</div>
}
