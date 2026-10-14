import { useEffect, useRef, useState } from 'react'
import { Paperclip, Upload, Download, Trash2, FileText, Image, RefreshCw, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { Attachment, Entry } from '../types'
import { useWorkspace } from '../hooks/useWorkspace'
import { acceptedFiles, fileSizeLabel, MAX_ATTACHMENTS, validateFile } from '../lib/files'
import { downloadAttachment, listAttachments, removeAttachment, uploadAttachment } from '../services/attachments'
import { Modal } from './ui/Modal'

export function AttachmentPanel({ entry }: { entry: Entry }) {
  const { refresh } = useWorkspace()
  const [files, setFiles] = useState<Attachment[]>([])
  const [loadedScope, setLoadedScope] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Attachment | null>(null)
  const [revision, setRevision] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const downloadRef = useRef<AbortController | null>(null)
  const scopeRef = useRef('')
  const scope = `${entry.userId}/${entry.id}`
  const visibleFiles = loadedScope === scope ? files : []

  useEffect(() => {
    const controller = new AbortController()
    scopeRef.current = scope
    setLoading(true)
    setError('')
    setPendingDelete(null)
    setBusy(null)
    void listAttachments(entry.id, controller.signal).then(result => {
      if (!controller.signal.aborted && scopeRef.current === scope) {
        setFiles(result)
        setLoadedScope(scope)
      }
    }).catch(problem => {
      if (!controller.signal.aborted) setError(problem instanceof Error ? problem.message : 'Unable to load attachments')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => { scopeRef.current = ''; controller.abort(); downloadRef.current?.abort() }
  }, [entry.id, scope, revision])

  const attach = async (file: File) => {
    try { validateFile(file) } catch (problem) { toast.error(problem instanceof Error ? problem.message : 'Invalid file'); return }
    setBusy('upload')
    try {
      const result = await uploadAttachment(entry.id, file)
      if (scopeRef.current !== scope) return
      setFiles(current => [result.attachment, ...current])
      setLoadedScope(scope)
      toast.success('File attached privately')
      await refresh()
    } catch (problem) {
      if (scopeRef.current === scope) toast.error(problem instanceof Error ? problem.message : 'Upload failed')
    } finally { if (scopeRef.current === scope) setBusy(null) }
  }

  const download = async (file: Attachment) => {
    downloadRef.current?.abort()
    const controller = new AbortController()
    downloadRef.current = controller
    setBusy(file.id)
    try { await downloadAttachment(file, controller.signal) } catch (problem) {
      if (!controller.signal.aborted && scopeRef.current === scope) toast.error(problem instanceof Error ? problem.message : 'Download failed')
    }
    finally { if (scopeRef.current === scope) setBusy(null) }
  }

  const remove = async () => {
    if (!pendingDelete) return
    const file = pendingDelete
    setBusy('remove')
    try {
      await removeAttachment(file.id)
      if (scopeRef.current !== scope) return
      setFiles(current => current.filter(record => record.id !== file.id))
      setPendingDelete(null)
      toast.success('Attachment removed')
      await refresh()
    } catch (problem) {
      if (scopeRef.current === scope) toast.error(problem instanceof Error ? problem.message : 'Unable to remove this attachment')
    } finally { if (scopeRef.current === scope) setBusy(null) }
  }

  return <section className="detail-section attachment-section">
    <div className="section-heading">
      <h2><Paperclip size={17} />Attachments<span className="section-count">{visibleFiles.length}</span></h2>
      <button className="button secondary small" disabled={loading || !!error || !!busy || visibleFiles.length >= MAX_ATTACHMENTS} onClick={() => fileInput.current?.click()}>
        {busy === 'upload' ? <LoaderCircle className="loading-icon" size={14} /> : <Upload size={14} />}
        {busy === 'upload' ? 'Uploading…' : 'Attach a file'}
      </button>
      <input hidden ref={fileInput} type="file" accept={acceptedFiles} aria-label="Choose an attachment" onChange={event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void attach(file)
      }} />
    </div>
    {loading ? <div className="attachment-skeleton skeleton" aria-label="Loading attachments" /> : error ? <div className="attachment-error" role="alert"><p>{error}</p><button className="text-button" onClick={() => setRevision(current => current + 1)}><RefreshCw size={14} />Try again</button></div> : visibleFiles.length ? <div className="attachment-list">
      {visibleFiles.map(file => <div className="attachment-row" key={file.id}>
        <span className="attachment-type-icon">{file.contentType.startsWith('image/') ? <Image size={18} /> : <FileText size={18} />}</span>
        <div className="attachment-copy"><strong>{file.name}</strong><span>{fileSizeLabel(file.size)} · Private attachment</span></div>
        <button className="icon-button" aria-label={`Download ${file.name}`} disabled={!!busy} onClick={() => void download(file)}>{busy === file.id ? <LoaderCircle className="loading-icon" size={16} /> : <Download size={16} />}</button>
        <button className="icon-button" aria-label={`Remove ${file.name}`} disabled={!!busy} onClick={() => setPendingDelete(file)}><Trash2 size={15} /></button>
      </div>)}
    </div> : <div className="attachments-empty"><Paperclip size={23} strokeWidth={1.5} /><div><strong>The supporting pieces belong here.</strong><p>Keep study PDFs, diagrams, and reference files beside your work.</p></div></div>}
    <p className="attachment-policy">PDF, Markdown, text, PNG, JPEG, or WebP · Up to 3 MB each · {MAX_ATTACHMENTS} files per item</p>
    <Modal open={!!pendingDelete} onClose={() => { if (busy !== 'remove') setPendingDelete(null) }} title="Remove this attachment?" description={`“${pendingDelete?.name || 'This file'}” will be permanently removed from your private storage. Your ${entry.kind} will stay untouched.`}>
      <div className="modal-footer"><button className="button secondary" disabled={busy === 'remove'} onClick={() => setPendingDelete(null)}>Keep file</button><button className="button danger-button" disabled={busy === 'remove'} onClick={() => void remove()}>{busy === 'remove' ? 'Removing…' : 'Remove file'}</button></div>
    </Modal>
  </section>
}
