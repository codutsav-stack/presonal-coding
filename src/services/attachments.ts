import type { Attachment } from '../types'

const endpoint = '/.netlify/functions/attachments'

async function attachmentRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, credentials: 'same-origin' })
  const result = await response.json().catch(() => ({ error: 'The attachment API is unavailable. Use Netlify Dev locally.' }))
  if (!response.ok || result.error) throw new Error(result.error || 'Unable to access this attachment')
  return result
}

export async function listAttachments(entryId: string, signal?: AbortSignal) {
  const result = await attachmentRequest<{ attachments: Attachment[] }>(`${endpoint}?entryId=${encodeURIComponent(entryId)}`, { signal })
  return result.attachments
}

export async function uploadAttachment(entryId: string, file: File) {
  const body = new FormData()
  body.set('entryId', entryId)
  body.set('file', file)
  return attachmentRequest<{ attachment: Attachment }>(endpoint, { method: 'POST', body })
}

export async function removeAttachment(id: string) {
  return attachmentRequest<{ deleted: string }>(`${endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function downloadAttachment(attachment: Attachment, signal?: AbortSignal) {
  const response = await fetch(`${endpoint}?id=${encodeURIComponent(attachment.id)}`, { credentials: 'same-origin', signal })
  if (!response.ok) {
    const result = await response.json().catch(() => ({ error: 'The file could not be downloaded' }))
    throw new Error(result.error || 'The file could not be downloaded')
  }
  const blob = await response.blob()
  signal?.throwIfAborted()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = attachment.name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
