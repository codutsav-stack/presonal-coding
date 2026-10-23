import { getUser } from '@netlify/identity'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/index'
import { entries, profiles, activities, tags, entryTags, attachments } from '../../db/schema'
import { entrySchema, preferencesSchema, importSchema } from '../../src/lib/validation'
import { defaults } from '../../src/types'

export default async (request: Request) => {
  const headers = { 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json' }
  const respond = (body: unknown, status = 200) => Response.json(body, { status, headers })
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) return respond({ error: 'Method not allowed' }, 405)
  if (request.method !== 'GET') { 
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) return respond({ error: 'Invalid request origin' }, 403)
    if (!request.headers.get('content-type')?.includes('application/json')) return respond({ error: 'JSON required' }, 415)
    if (Number(request.headers.get('content-length') || 0) > 2000000) return respond({ error: 'Request too large' }, 413)
  }
  const user = await getUser()
  if (!user) return respond({ error: 'Sign in to access your private workspace' }, 401)
  try {
    const db = getDb()
    const url = new URL(request.url)
    const rawBody = request.method !== 'GET' ? await request.text() : ''
    if (rawBody.length > 2000000) return respond({ error: 'Request too large' }, 413)
    const body = rawBody ? JSON.parse(rawBody) : {}
    return await db.transaction(async transaction => {
      await transaction.execute(sql`select set_config('app.user_id', ${user.id}, true)`)
      await transaction.insert(profiles).values({ id: user.id, name: user.name || '', preferences: defaults }).onConflictDoNothing()
      const owner = eq(entries.userId, user.id)
      if (request.method === 'GET') {
        const offset = z.coerce.number().int().min(0).max(100000000).parse(url.searchParams.get('offset') || 0)
        const records = await transaction.select().from(entries).where(owner).orderBy(desc(entries.createdAt), entries.id).limit(251).offset(offset)
        const recent = offset === 0 ? await transaction.select().from(activities).where(eq(activities.userId, user.id)).orderBy(desc(activities.createdAt)).limit(30) : []
        const [profile] = await transaction.select().from(profiles).where(eq(profiles.id, user.id))
        return respond({ entries: records.slice(0, 250), more: records.length > 250, activities: recent, preferences: profile.preferences })
      }
      if (body.action === 'preferences' && request.method === 'PATCH') {
        const preferences = preferencesSchema.parse(body.preferences)
        await transaction.update(profiles).set({ preferences, updatedAt: new Date() }).where(eq(profiles.id, user.id))
        return respond({ preferences })
      }
      const checkReferences = async (input: z.output<typeof entrySchema>, currentId?: string) => {
        for (const [reference, expected] of [[input.projectId, 'project'], [input.parentId, 'note']] as const) {
          if (!reference) continue
          if (reference === currentId) throw new Error('An item cannot reference itself')
          const [record] = await transaction.select().from(entries).where(and(owner, eq(entries.id, reference)))
          if (!record || record.kind !== expected) throw new Error('The linked item is not available in your workspace')
          if (expected === 'note') {
            let ancestor = record.parentId
            const visited = new Set<string>()
            while (ancestor) {
              if (ancestor === currentId || visited.has(ancestor)) throw new Error('Note folders cannot contain a cycle')
              visited.add(ancestor)
              const [parent] = await transaction.select().from(entries).where(and(owner, eq(entries.id, ancestor)))
              ancestor = parent?.parentId || null
            }
          }
        }
      }
      const syncTags = async (entryId: string, names: string[]) => {
        await transaction.delete(entryTags).where(and(eq(entryTags.entryId, entryId), eq(entryTags.userId, user.id)))
        for (const name of [...new Set(names)]) {
          let [tag] = await transaction.select().from(tags).where(and(eq(tags.userId, user.id), eq(tags.name, name)))
          if (!tag) {
            await transaction.insert(tags).values({ userId: user.id, name }).onConflictDoNothing()
            ;[tag] = await transaction.select().from(tags).where(and(eq(tags.userId, user.id), eq(tags.name, name)))
          }
          await transaction.insert(entryTags).values({ entryId, tagId: tag.id, userId: user.id }).onConflictDoNothing()
        }
      }
      if (body.action === 'import' && request.method === 'POST') {
        const imported = importSchema.parse(body.payload)
        for (const input of imported.entries) {
          const [record] = await transaction.insert(entries).values({ ...input, projectId: null, parentId: null, userId: user.id }).returning()
          await syncTags(record.id, input.tags)
          await transaction.insert(activities).values({ userId: user.id, entryId: record.id, kind: record.kind, title: record.title, action: 'Imported' })
        }
        return respond({ count: imported.entries.length }, 201)
      }
      if (request.method === 'POST') {
        const input = entrySchema.parse(body.entry)
        await checkReferences(input)
        if (['Solved', 'Completed'].includes(input.status)) input.data.completedAt = new Date().toISOString()
        else delete input.data.completedAt
        const [record] = await transaction.insert(entries).values({ ...input, userId: user.id }).returning()
        await syncTags(record.id, input.tags)
        await transaction.insert(activities).values({ userId: user.id, entryId: record.id, kind: record.kind, title: record.title, action: 'Created' })
        return respond({ entry: record }, 201)
      }
      const id = z.uuid().parse(body.id)
      const scope = and(owner, eq(entries.id, id))
      const [existing] = await transaction.select().from(entries).where(scope)
      if (!existing) return respond({ error: 'Item not found' }, 404)
      if (request.method === 'DELETE') {
        const [attached] = await transaction.select({ id: attachments.id }).from(attachments).where(and(eq(attachments.userId, user.id), eq(attachments.entryId, id))).limit(1)
        if (attached) return respond({ error: 'Remove this item’s attachments from its detail page before deleting it.' }, 409)
        await transaction.delete(entries).where(scope)
        await transaction.insert(activities).values({ userId: user.id, kind: existing.kind, title: existing.title, action: 'Deleted' })
        return respond({ deleted: id })
      }
      if (body.action === 'open') {
        await transaction.update(entries).set({ openedAt: new Date() }).where(scope)
        return respond({ opened: id })
      }
      const input = entrySchema.parse(body.entry)
      if (input.kind !== existing.kind) return respond({ error: 'An item type cannot be changed' }, 400)
      await checkReferences(input, id)
      if (['Solved', 'Completed'].includes(input.status)) input.data.completedAt = existing.status === input.status && existing.data.completedAt ? existing.data.completedAt : new Date().toISOString()
      else delete input.data.completedAt
      const [record] = await transaction.update(entries).set({ ...input, updatedAt: new Date() }).where(scope).returning()
      await syncTags(record.id, input.tags)
      await transaction.insert(activities).values({ userId: user.id, entryId: record.id, kind: record.kind, title: record.title, action: 'Updated' })
      return respond({ entry: record })
    })
  } catch (error) {
    if (error instanceof z.ZodError) return respond({ error: error.issues[0]?.message || 'Invalid input' }, 400)
    if (error instanceof SyntaxError) return respond({ error: 'Invalid JSON' }, 400)
    const known = error instanceof Error && /cannot reference|linked item|cannot contain/.test(error.message)
    return respond({ error: known ? (error as Error).message : 'Your workspace is temporarily unavailable. Please try again.' }, known ? 400 : 503)
  }
}
