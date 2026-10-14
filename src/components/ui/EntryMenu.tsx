import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Pin, Copy, Archive, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Entry } from '../../types'
import { useWorkspace } from '../../hooks/useWorkspace'
import { Modal } from './Modal'

export function EntryMenu({ entry }: { entry: Entry }) {
  const { setEditor, update, duplicate, remove } = useWorkspace()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const handle = async (action: () => Promise<void>) => { try { await action() } catch (error) { toast.error(error instanceof Error ? error.message : 'Action failed') } }
  return <><Dropdown.Root><Dropdown.Trigger asChild><button className="icon-button entry-menu-trigger" aria-label={`Actions for ${entry.title}`}><MoreHorizontal size={19} /></button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content className="dropdown-menu" align="end" sideOffset={6}>
    <Dropdown.Item onSelect={() => setEditor({ kind: entry.kind, entry })}><Pencil size={15} />Edit</Dropdown.Item>
    <Dropdown.Item onSelect={() => void handle(() => update(entry, { pinned: !entry.pinned }))}><Pin size={15} />{entry.pinned ? 'Unpin' : 'Pin to workspace'}</Dropdown.Item>
    <Dropdown.Item onSelect={() => void handle(() => duplicate(entry))}><Copy size={15} />Duplicate</Dropdown.Item>
    {entry.kind === 'project' && <Dropdown.Item onSelect={() => void handle(() => update(entry, { status: entry.status === 'Archived' ? 'Idea' : 'Archived' }))}><Archive size={15} />{entry.status === 'Archived' ? 'Restore' : 'Archive'}</Dropdown.Item>}
    <Dropdown.Separator /><Dropdown.Item className="danger" onSelect={() => setConfirm(true)}><Trash2 size={15} />Delete</Dropdown.Item>
  </Dropdown.Content></Dropdown.Portal></Dropdown.Root>
  <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete this item?" description={`“${entry.title}” will be permanently removed. This cannot be undone.`}><div className="modal-footer"><button className="button secondary" onClick={() => setConfirm(false)}>Keep item</button><button className="button danger-button" disabled={busy} onClick={async () => { setBusy(true); try { await remove(entry); setConfirm(false) } catch (error) { toast.error(error instanceof Error ? error.message : 'Deletion failed') } finally { setBusy(false) } }}>{busy ? 'Deleting…' : 'Delete item'}</button></div></Modal></>
}
