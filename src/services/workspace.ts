import type { Workspace, Entry, Preferences } from '../types'
import type { EntryInput } from '../lib/validation'
async function request<T>(method: string, body?: unknown, query = ''): Promise<T> {
  const response = await fetch(`/.netlify/functions/workspace${query}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const result = await response.json().catch(() => ({ error: 'The workspace API is unavailable. Use Netlify Dev locally.' }))
  if (!response.ok) throw new Error(result.error || 'Something went wrong')
  return result
}
export async function loadWorkspace(): Promise<Workspace> {
  const first = await request<Workspace & { more: boolean }>('GET')
  const all = [...first.entries]
  let more = first.more
  while (more) {
    const page = await request<Workspace & { more: boolean }>('GET', undefined, `?offset=${all.length}`)
    all.push(...page.entries)
    more = page.more
  }
  return { entries: all, activities: first.activities, preferences: first.preferences }
}
export async function saveEntry(entry: EntryInput, id?: string) { return request<{ entry: Entry }>(id ? 'PATCH' : 'POST', { entry, id }) }
export async function deleteEntry(id: string) { return request('DELETE', { id }) }
export async function openEntry(id: string) { return request('PATCH', { id, action: 'open' }) }
export async function savePreferences(preferences: Preferences) { return request('PATCH', { action: 'preferences', preferences }) }
export async function importEntries(payload: unknown) { return request<{ count: number }>('POST', { action: 'import', payload }) }
