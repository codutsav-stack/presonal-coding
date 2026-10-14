import { getUser } from '@netlify/identity'
import { getStore } from '@netlify/blobs'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/index'
import { activities, attachments, entries } from '../../db/schema'
import { MAX_ATTACHMENTS, MAX_FILE_BYTES, validateFile } from '../../src/lib/files'

export default async (request: Request) => {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
  const respond = (body: unknown, status = 200) => Response.json(body, { status, headers })
  if (!['GET', 'POST', 'DELETE'].includes(request.method)) return respond({ error: 'Method not allowed' }, 405)
  const user = await getUser()
  if (!user) return respond({ error: 'Sign in to access your private attachments' }, 401)
  if (request.method !== 'GET' && request.headers.get('origin') !== new URL(request.url).origin) {
    return respond({ error: 'Invalid request origin' }, 403)
  }
  const url = new URL(request.url)
  let uploadedKey: string | undefined
  try {
    const db = getDb()
    const store = getStore({ name: 'devvault-attachments', consistency: 'strong' })
    return await db.transaction(async transaction => {
      await transaction.execute(sql`select set_config('app.user_id', ${user.id}, true)`)
      const owner = eq(attachments.userId, user.id)
      if (request.method === 'GET' && !url.searchParams.has('id')) {
        const entryId = z.uuid().parse(url.searchParams.get('entryId'))
        const [parent] = await transaction.select().from(entries).where(and(eq(entries.id, entryId), eq(entries.userId, user.id)))
        if (!parent) return respond({ error: 'Item not found' }, 404)
        const files = await transaction.select({
          id: attachments.id, entryId: attachments.entryId, name: attachments.name,
          contentType: attachments.contentType, size: attachments.size, createdAt: attachments.createdAt,
        }).from(attachments).where(and(owner, eq(attachments.entryId, entryId))).orderBy(desc(attachments.createdAt)).limit(MAX_ATTACHMENTS)
        return respond({ attachments: files })
      }
      if (request.method === 'POST') {
        if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return respond({ error: 'A file upload is required' }, 415)
        if (Number(request.headers.get('content-length') || 0) > MAX_FILE_BYTES + 32768) return respond({ error: 'Attachments must be 3 MB or smaller.' }, 413)
        const form = await request.formData()
        const entryId = z.uuid().parse(form.get('entryId'))
        const file = form.get('file')
        if (!(file instanceof File)) return respond({ error: 'Choose a file to attach' }, 400)
        let contentType: string
        try { contentType = validateFile(file) } catch (error) { return respond({ error: error instanceof Error ? error.message : 'Invalid file' }, 400) }
        const [parent] = await transaction.select().from(entries).where(and(eq(entries.id, entryId), eq(entries.userId, user.id))).for('update')
        if (!parent) return respond({ error: 'Item not found' }, 404)
        if (!['note', 'project'].includes(parent.kind)) return respond({ error: 'Attachments belong to notes and projects' }, 400)
        const [existing] = await transaction.select({ total: count() }).from(attachments).where(and(owner, eq(attachments.entryId, entryId)))
        if (existing.total >= MAX_ATTACHMENTS) return respond({ error: 'An item can have up to 20 attachments' }, 409)
        const id = crypto.randomUUID()
        const blobKey = `${user.id}/${id}`
        const name = file.name.replace(/[\\/\u0000-\u001f\u007f]/g, '_').trim().slice(0, 180) || 'attachment'
        await store.set(blobKey, await file.arrayBuffer())
        uploadedKey = blobKey
        const [record] = await transaction.insert(attachments).values({ id, userId: user.id, entryId, name, contentType, size: file.size, blobKey }).returning({
          id: attachments.id, entryId: attachments.entryId, name: attachments.name,
          contentType: attachments.contentType, size: attachments.size, createdAt: attachments.createdAt,
        })
        await transaction.update(entries).set({ updatedAt: new Date() }).where(and(eq(entries.id, entryId), eq(entries.userId, user.id)))
        await transaction.insert(activities).values({ userId: user.id, entryId, kind: parent.kind, title: parent.title, action: 'Attached a file to' })
        return respond({ attachment: record }, 201)
      }
      const id = z.uuid().parse(url.searchParams.get('id'))
      const [record] = await transaction.select().from(attachments).where(and(owner, eq(attachments.id, id))).for('update')
      if (!record) return respond({ error: 'Attachment not found' }, 404)
      if (request.method === 'GET') {
        const binary = await store.get(record.blobKey, { type: 'arrayBuffer' })
        if (!binary) return respond({ error: 'This attachment is unavailable' }, 404)
        const filename = encodeURIComponent(record.name).replace(/['()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
        return new Response(binary, { headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="devvault-attachment"; filename*=UTF-8''${filename}`,
          'Content-Security-Policy': "sandbox; default-src 'none'",
        } })
      }
      await store.delete(record.blobKey)
      await transaction.delete(attachments).where(and(owner, eq(attachments.id, id)))
      await transaction.update(entries).set({ updatedAt: new Date() }).where(and(eq(entries.id, record.entryId), eq(entries.userId, user.id)))
      return respond({ deleted: id })
    })
  } catch (error) {
    if (uploadedKey) {
      try { await getStore('devvault-attachments').delete(uploadedKey) } catch {}
    }
    if (error instanceof z.ZodError) return respond({ error: 'Choose a valid workspace item or attachment' }, 400)
    return respond({ error: 'Attachments are temporarily unavailable. Please try again.' }, 503)
  }
}
