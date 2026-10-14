import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, ArrowUp, ArrowDown, CornerDownLeft, Plus, FolderKanban, Braces, BookOpen, Link2, CheckSquare, SlidersHorizontal, X } from 'lucide-react'
import { useWorkspace } from '../hooks/useWorkspace'
import { navigation } from './layout/Sidebar'
import { Modal } from './ui/Modal'
import { searchEntries } from '../lib/utils'
import { kinds, labels, paths, type Kind } from '../types'

const icons = { project: FolderKanban, question: Braces, note: BookOpen, resource: Link2, task: CheckSquare }
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries, add, loading, user } = useWorkspace()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState(0)
  const [filter, setFilter] = useState<Kind | 'all'>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { const timeout = setTimeout(() => { setDebounced(query); setSelected(0) }, 180); return () => clearTimeout(timeout) }, [query])
  useEffect(() => {
    if (open) { setQuery(''); setDebounced(''); setSelected(0); setFilter('all') }
  }, [open, user?.id])
  const results = useMemo(() => {
    if (debounced.trim() || filter !== 'all') {
      const records = entries.filter(entry => filter === 'all' || entry.kind === filter)
      const matches = debounced.trim() ? searchEntries(records, debounced) : [...records].sort((first, second) => +new Date(second.updatedAt) - +new Date(first.updatedAt))
      return matches.slice(0, 12).map(entry => ({
        id: entry.id, label: entry.title, subtitle: `${labels[entry.kind]} · ${entry.category}`,
        icon: icons[entry.kind], action: () => navigate(`${paths[entry.kind]}/${entry.id}`),
      }))
    }
    return [
      ...navigation.map(item => ({ id: item.path, label: item.label, subtitle: 'Navigation', icon: item.icon, action: () => navigate(item.path) })),
      ...kinds.map(kind => ({ id: `add-${kind}`, label: `Add ${labels[kind].toLowerCase()}`, subtitle: 'Quick action', icon: Plus, action: () => add(kind) })),
    ]
  }, [entries, debounced, filter, navigate, add])
  const execute = (index: number) => {
    const result = results[index]
    if (!result) return
    onClose()
    result.action()
  }
  useEffect(() => { setSelected(0) }, [filter, results.length])
  useEffect(() => {
    if (open) document.getElementById(`command-result-${selected}`)?.scrollIntoView({ block: 'nearest' })
  }, [selected, open])
  const searching = query !== debounced
  return <Modal open={open} onClose={onClose} title="Search your universe" description="Find a project, a note, a question, or your next step." className="command-modal">
    <div className="command-input">
      <Search size={20} />
      <input ref={inputRef} autoFocus role="combobox" aria-autocomplete="list" aria-label="Search workspace" aria-expanded={open} aria-controls="command-results" aria-activedescendant={results[selected] ? `command-result-${selected}` : undefined} value={query} onChange={event => setQuery(event.target.value)} placeholder="Where do you want to go?" onKeyDown={event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(current => (current + 1) % Math.max(1, results.length)) }
        if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(current => (current - 1 + Math.max(1, results.length)) % Math.max(1, results.length)) }
        if (event.key === 'Enter') { event.preventDefault(); if (!searching) execute(selected) }
      }} />
      {query ? <button className="text-button" onClick={() => { setQuery(''); inputRef.current?.focus() }}>Clear</button> : <kbd>ESC</kbd>}
    </div>
    <div className="command-filters" role="group" aria-label="Filter search by item type">
      <SlidersHorizontal size={13} />
      {(['all', ...kinds] as const).map(kind => <button key={kind} aria-pressed={filter === kind} className={filter === kind ? 'active' : ''} onClick={() => { setFilter(kind); inputRef.current?.focus() }}>{kind === 'all' ? 'Everything' : labels[kind]}</button>)}
    </div>
    <div className="command-results" id="command-results" role="listbox" aria-label="Search results" aria-busy={loading || searching}>
      <div className="command-result-heading"><p className="eyebrow">{debounced ? 'WORKSPACE RESULTS' : filter !== 'all' ? 'RECENTLY UPDATED' : 'JUMP TO'}</p><span aria-live="polite">{searching ? 'Searching…' : debounced || filter !== 'all' ? `${results.length} results` : 'Navigation & quick actions'}</span></div>
      {loading && (debounced || filter !== 'all') ? <p className="command-empty">Loading your private workspace…</p> : results.length ? results.map((item, index) => <button key={item.id} id={`command-result-${index}`} role="option" aria-selected={selected === index} className={`command-result ${selected === index ? 'selected' : ''}`} onMouseMove={() => setSelected(index)} onClick={() => execute(index)}>
        <span className="command-result-icon"><item.icon size={18} /></span><span><strong>{item.label}</strong><small>{item.subtitle}</small></span><CornerDownLeft size={14} />
      </button>) : <div className="command-empty"><Search size={25} /><h3>No matches yet.</h3><p>Try a title, technology, topic, or tag.</p>{filter !== 'all' && <button className="text-button" onClick={() => setFilter('all')}><X size={13} />Clear type filter</button>}</div>}
    </div>
    <div className="command-footer"><span><kbd><ArrowUp size={11} /></kbd><kbd><ArrowDown size={11} /></kbd>to navigate</span><span><kbd><CornerDownLeft size={11} /></kbd>to open</span><span><kbd>esc</kbd>to close</span></div>
  </Modal>
}
