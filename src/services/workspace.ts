import type { Workspace, Entry, Preferences } from '../types'
import type { EntryInput } from '../lib/validation'
import {
  loadWorkspace as supabaseLoadWorkspace,
  saveEntry as supabaseSaveEntry,
  deleteEntry as supabaseDeleteEntry,
  openEntry as supabaseOpenEntry,
  savePreferences as supabaseSavePreferences,
  importEntries as supabaseImportEntries,
  isSupabaseConfigured,
} from '../lib/supabase'

export async function loadWorkspace(): Promise<Workspace> {
  if (!isSupabaseConfigured()) {
    return {
      entries: [],
      activities: [],
      preferences: { theme: 'dark', reducedMotion: false, defaultView: 'grid', weeklyGoal: 5 },
    }
  }
  return supabaseLoadWorkspace()
}

export async function saveEntry(entry: EntryInput, id?: string): Promise<{ entry: Entry }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
  }
  return supabaseSaveEntry(entry, id)
}

export async function deleteEntry(id: string): Promise<{ deleted: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.')
  }
  return supabaseDeleteEntry(id)
}

export async function openEntry(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  return supabaseOpenEntry(id)
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  if (!isSupabaseConfigured()) return
  return supabaseSavePreferences(preferences)
}

export async function importEntries(payload: unknown): Promise<{ count: number }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.')
  }
  return supabaseImportEntries(payload)
}
