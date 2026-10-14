import { Link } from 'react-router'
import { motion } from 'motion/react'
import { ArrowUpRight, Code2, Braces, BookOpen, Link2, CheckSquare, Pin, Github, Globe, Cpu, Workflow, Terminal, Network, Layers } from 'lucide-react'
import type { Entry } from '../types'
import { paths } from '../types'
import { relativeDate, safeHref, dateLabel } from '../lib/utils'
import { EntryMenu } from './ui/EntryMenu'

export const kindIcons = { project: Code2, question: Braces, note: BookOpen, resource: Link2, task: CheckSquare }
export function ProjectVisual({ category, cover, title }: { category: string; cover?: string; title?: string }) {
  if (safeHref(cover)) return <div className="project-visual photo"><img src={cover} alt={title || 'Project cover'} loading="lazy" /></div>
  const categoryIndex = ['Web Development', 'Generative AI', 'Python', 'Machine Learning', 'Data Science', 'Automation & n8n', 'C++ / DSA'].indexOf(category)
  const Icon = [Code2, Cpu, Terminal, Network, Layers, Workflow, Braces][categoryIndex] || Code2
  return <div className={`project-visual visual-${Math.max(0, categoryIndex) % 4}`}><div className="visual-grid" /><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="visual-center"><Icon size={39} strokeWidth={1.2} /></div><span className="visual-label">{category}</span><span className="visual-corner">↗</span></div>
}
export function StatusBadge({ status }: { status: string }) { return <span className={`status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span> }
export function EntryCard({ entry, compact = false }: { entry: Entry; compact?: boolean }) {
  const Icon = kindIcons[entry.kind]
  const technologies = String(entry.data.technologies || '').split(',').filter(Boolean)
  return <motion.article layout className={`entry-card ${entry.kind}-card ${compact ? 'compact-card' : ''}`} whileHover={{ y: -3 }} transition={{ duration: .18 }}>
    {entry.kind === 'project' && !compact && <Link to={`${paths[entry.kind]}/${entry.id}`} tabIndex={-1} aria-hidden="true"><ProjectVisual category={entry.category} cover={String(entry.data.cover || '')} title={entry.title} /></Link>}
    <div className="entry-card-content"><div className="entry-card-top"><span className="entry-category">{entry.kind !== 'project' && <Icon size={15} />}{entry.category}</span><div className="card-top-actions">{entry.pinned && <Pin size={13} className="pinned-indicator" />}<EntryMenu entry={entry} /></div></div>
    <Link to={`${paths[entry.kind]}/${entry.id}`} className="entry-card-title">{entry.title}<ArrowUpRight size={16} /></Link><p className="entry-card-description">{entry.description || (entry.kind === 'note' ? String(entry.data.content || '').slice(0, 130) : 'A new addition to your developer universe.')}</p>
    <div className="card-tags">{entry.kind === 'question' && <span className={`difficulty difficulty-${String(entry.data.difficulty).toLowerCase()}`}>{String(entry.data.difficulty || 'Easy')}</span>}{entry.kind === 'task' && <><span className={`priority priority-${String(entry.data.priority).toLowerCase()}`}>{String(entry.data.priority || 'Medium')} priority</span>{entry.data.dueDate && <span className="tag">Due {dateLabel(String(entry.data.dueDate))}</span>}</>}{entry.kind === 'note' && entry.data.folder && <span className="tag">{String(entry.data.folder)}</span>}{(technologies.length ? technologies : entry.tags).slice(0, 3).map(tag => <span className="tag" key={tag}>{tag.trim()}</span>)}</div>
    <div className="entry-card-footer"><StatusBadge status={entry.status} /><span className="card-updated">{relativeDate(entry.updatedAt)}</span>{entry.kind === 'project' && <div className="project-links">{safeHref(entry.data.github) && <a href={safeHref(entry.data.github)} target="_blank" rel="noopener noreferrer" aria-label={`${entry.title} GitHub repository`}><Github size={14} /></a>}{safeHref(entry.data.live) && <a href={safeHref(entry.data.live)} target="_blank" rel="noopener noreferrer" aria-label={`${entry.title} live website`}><Globe size={14} /></a>}</div>}</div></div>
  </motion.article>
}
