import type { Attachment } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function listAttachments(entryId: string, signal?: AbortSignal): Promise<Attachment[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('attachments')
    .select('id, entry_id, name, content_type, size, created_at')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: false })
    .abortSignal(signal || new AbortController().signal)

  if (error) {
    if (signal?.aborted) return []
    throw new Error(error.message)
  }

  return (data || []).map(row => ({
    id: String(row.id),
    entryId: String(row.entry_id),
    name: String(row.name),
    contentType: String(row.content_type),
    size: Number(row.size),
    createdAt: String(row.created_at),
  }))
}

export async function uploadAttachment(entryId: string, file: File): Promise<{ attachment: Attachment }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase storage is not configured.')
  }

  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('Sign in required to attach files')
  const userId = authData.user.id

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const blobKey = `${userId}/${entryId}/${Date.now()}_${sanitized}`

  // 1. Upload to Supabase Storage bucket 'attachments'
  const { error: storageError } = await supabase.storage
    .from('attachments')
    .upload(blobKey, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

  // If storage upload failed (e.g., bucket not created yet in free tier),
  // we still save metadata if possible or throw helpful error
  if (storageError) {
    // Attempt fallback or report error
    throw new Error(`Storage upload failed: ${storageError.message}`)
  }

  // 2. Insert record in attachments table
  const { data, error: dbError } = await supabase
    .from('attachments')
    .insert({
      user_id: userId,
      entry_id: entryId,
      name: file.name,
      content_type: file.type || 'application/octet-stream',
      size: file.size,
      blob_key: blobKey,
    })
    .select('id, entry_id, name, content_type, size, created_at')
    .single()

  if (dbError) {
    // Compensate by deleting uploaded blob
    await supabase.storage.from('attachments').remove([blobKey]).catch(() => {})
    throw new Error(dbError.message)
  }

  return {
    attachment: {
      id: String(data.id),
      entryId: String(data.entry_id),
      name: String(data.name),
      contentType: String(data.content_type),
      size: Number(data.size),
      createdAt: String(data.created_at),
    },
  }
}

export async function removeAttachment(id: string): Promise<{ deleted: string }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('Sign in required')

  // Find blobKey
  const { data: record, error: findError } = await supabase
    .from('attachments')
    .select('id, blob_key')
    .eq('id', id)
    .single()

  if (findError || !record) throw new Error('Attachment not found')

  // Delete from storage
  if (record.blob_key) {
    await supabase.storage.from('attachments').remove([record.blob_key]).catch(() => {})
  }

  // Delete from table
  const { error: deleteError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id)

  if (deleteError) throw new Error(deleteError.message)

  return { deleted: id }
}

export async function downloadAttachment(attachment: Attachment, signal?: AbortSignal): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')

  const { data: record, error: findError } = await supabase
    .from('attachments')
    .select('blob_key')
    .eq('id', attachment.id)
    .single()

  if (findError || !record?.blob_key) throw new Error('Attachment file path not found')

  const { data: blob, error: downloadError } = await supabase.storage
    .from('attachments')
    .download(record.blob_key)

  if (downloadError || !blob) {
    throw new Error(downloadError?.message || 'Download failed')
  }

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
