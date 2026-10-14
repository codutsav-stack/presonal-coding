import { useEffect, useState } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Save, ChevronDown } from 'lucide-react'
import { Modal } from './ui/Modal'
import { useWorkspace } from '../hooks/useWorkspace'
import { entrySchema, type EntryInput, type EntryValues } from '../lib/validation'
import { categories, labels, statuses } from '../types'

export function EntryEditor() {
  const { editor, setEditor, save, entries, user } = useWorkspace()
  const [advanced, setAdvanced] = useState(false)
  const [error, setError] = useState('')
  const form = useForm<EntryInput, unknown, EntryValues>({ resolver: zodResolver(entrySchema) })
  useEffect(() => {
    if (!editor) return
    const entry = editor.entry
    form.reset(entry || { kind: editor.kind, title: '', description: '', category: categories[editor.kind][0], status: statuses[editor.kind][0], pinned: false, tags: [], data: editor.kind === 'question' ? { difficulty: 'Easy', source: 'Custom', attempts: 0, confidence: 0 } : editor.kind === 'task' ? { priority: 'Medium' } : {}, parentId: null, projectId: null })
    setError(''); setAdvanced(false)
  }, [editor, form])
  if (!editor) return null
  const kind = editor.kind
  const errors = form.formState.errors
  const errorFor = (name: string) => {
    const keys = name.split('.')
    let value: unknown = errors
    for (const key of keys) value = (value as Record<string, unknown> | undefined)?.[key]
    return (value as { message?: string } | undefined)?.message
  }
  const field = (name: string, label: string, placeholder = '', type = 'text', large = false) => <label key={name} className={large ? 'span-two' : ''}>{label}{large ? <textarea {...form.register(name as FieldPath<EntryInput>)} placeholder={placeholder} rows={name.includes('code') ? 12 : 5} className={name.includes('code') ? 'code-input' : ''} /> : <input {...form.register(name as FieldPath<EntryInput>, type === 'number' ? { valueAsNumber: true } : {})} type={type} placeholder={placeholder} />}{errorFor(name) && <span className="field-error">{errorFor(name)}</span>}</label>
  const select = (name: string, label: string, options: string[]) => <label key={name}>{label}<select {...form.register(name as FieldPath<EntryInput>)}>{options.map(option => <option key={option}>{option}</option>)}</select></label>
  const submit = form.handleSubmit(async values => {
    setError('')
    try { await save(values, editor.entry?.id); setEditor(null) } catch (problem) { setError(problem instanceof Error ? problem.message : 'Unable to save') }
  }, () => { setAdvanced(true); setError('Check the highlighted fields before saving.') })
  return <Modal open onClose={() => setEditor(null)} title={`${editor.entry ? 'Edit' : 'Add'} ${labels[kind].toLowerCase()}`} description={kind === 'project' ? 'Every great project starts with a little space.' : 'Capture it now. Come back to it whenever you need.'} className="editor-modal">
    <form onSubmit={submit}>
      <div className="editor-body"><div className="form-grid">
        <div className="span-two">{field('title', kind === 'question' ? 'Problem title' : 'Title', kind === 'project' ? 'Your next big idea' : `Give your ${labels[kind].toLowerCase()} a name`)}</div>
        {field('description', kind === 'question' ? 'Problem statement' : 'Description', 'What is this all about?', 'text', true)}
        {select('category', kind === 'question' ? 'Topic' : 'Category', categories[kind])}
        {select('status', 'Status', statuses[kind])}
        {kind === 'project' && field('data.technologies', 'Technology stack', 'React, TypeScript, Python')}
        {kind === 'question' && <>{select('data.difficulty', 'Difficulty', ['Easy', 'Medium', 'Hard'])}{select('data.source', 'Source', ['Custom', 'LeetCode', 'College Assignment', 'Codeforces', 'HackerRank', 'Other'])}</>}
        {kind === 'resource' && field('data.url', 'Resource URL', 'https://…', 'url')}
        {kind === 'task' && <>{select('data.priority', 'Priority', ['Low', 'Medium', 'High'])}{field('data.dueDate', 'Due date', '', 'date')}<label className="span-two">Linked project<select {...form.register('projectId', { setValueAs: value => value || null })}><option value="">No linked project</option>{entries.filter(entry => entry.kind === 'project').map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label></>}
        {kind === 'note' && <>{field('data.content', 'Markdown content', '# A new idea\n\nWrite freely. Markdown and code blocks are supported.', 'text', true)}{field('data.folder', 'Folder path', 'Semester 3 / Computer Networks')}<label>Parent note<select {...form.register('parentId', { setValueAs: value => value || null })}><option value="">No parent note</option>{entries.filter(entry => entry.kind === 'note' && entry.id !== editor.entry?.id).map(entry => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label></>}
        <label className="span-two">Tags<input {...form.register('tags', { setValueAs: value => typeof value === 'string' ? value.split(',').map(tag => tag.trim()).filter(Boolean) : value })} defaultValue={editor.entry?.tags.join(', ')} placeholder="Separate tags with commas" />{errorFor('tags') && <span className="field-error">{errorFor('tags')}</span>}</label>
      </div>
      <button type="button" className="advanced-toggle" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>More details<ChevronDown size={16} className={advanced ? 'rotate' : ''} /></button>
      {advanced && <div className="form-grid advanced-fields">
        {kind === 'project' && <>{field('data.details', 'Detailed description', 'The story, architecture, and goals', 'text', true)}{field('data.github', 'GitHub repository', 'https://github.com/…', 'url')}{field('data.live', 'Live deployment', 'https://…', 'url')}{field('data.documentation', 'Documentation URL', 'https://…', 'url')}{field('data.cover', 'Cover image URL', 'https://…', 'url')}{field('data.startDate', 'Start date', '', 'date')}{field('data.milestones', 'Milestones', 'Describe the next important steps', 'text', true)}</>}
        {kind === 'question' && <>{field('data.subtopic', 'Subtopic', 'e.g. Prefix sums')}{field('data.number', 'Problem number', 'Optional')}{field('data.url', 'Original problem URL', 'https://…', 'url')}{field('data.attempts', 'Attempt count', '0', 'number')}{field('data.constraints', 'Constraints', '', 'text', true)}{field('data.samples', 'Sample test cases', '', 'text', true)}{field('data.approach', 'Approach & explanation', '', 'text', true)}{field('data.timeComplexity', 'Time complexity', 'O(n)')}{field('data.spaceComplexity', 'Space complexity', 'O(1)')}{field('data.code', 'C++ solution', '#include <iostream>\n\n// Your solution', 'text', true)}{field('data.confidence', 'Confidence (0–5)', '0', 'number')}{field('data.nextReview', 'Next review', '', 'date')}</>}
        {kind === 'note' && field('data.url', 'Related external link', 'https://…', 'url')}
        {field('data.notes', 'Personal notes', 'For your future self', 'text', true)}
      </div>}
      <label className="checkbox-label"><input type="checkbox" {...form.register('pinned')} />{kind === 'question' ? 'Bookmark for later' : 'Pin to your workspace'}</label>
      {!user && <p className="form-notice">You can draft here. Sign in when you’re ready to save privately.</p>}
      {error && <div className="error-banner" role="alert">{error}</div>}
      </div>
      <div className="modal-footer"><button type="button" className="button secondary" onClick={() => setEditor(null)}>Cancel</button><button className="button primary" disabled={form.formState.isSubmitting}>{editor.entry ? <Save size={16} /> : <Plus size={16} />}{form.formState.isSubmitting ? 'Saving…' : editor.entry ? 'Save changes' : `Add ${labels[kind].toLowerCase()}`}</button></div>
    </form>
  </Modal>
}
