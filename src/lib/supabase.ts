import { createClient, type Session } from '@supabase/supabase-js'
import { defaults, type Entry, type Activity, type Preferences, type Workspace, type Kind } from '../types'
import { entrySchema, importSchema, preferencesSchema, type EntryInput } from './validation'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const configuredOwnerEmail = (import.meta.env.VITE_OWNER_EMAIL || '').toLowerCase().trim()

export function isSupabaseConfigured(): boolean {
  if (!rawSupabaseUrl || !rawSupabaseAnonKey) return false
  if (
    rawSupabaseUrl.includes('placeholder') || 
    rawSupabaseUrl.includes('your-project') || 
    rawSupabaseUrl.includes('YOUR_ACTUAL_')
  ) {
    return false
  }
  if (
    rawSupabaseAnonKey.includes('placeholder') || 
    rawSupabaseAnonKey.includes('your-anon-key') || 
    rawSupabaseAnonKey.includes('YOUR_ACTUAL_')
  ) {
    return false
  }
  return rawSupabaseUrl.startsWith('https://') || rawSupabaseUrl.startsWith('http://')
}

export const supabase = createClient(
  isSupabaseConfigured() ? rawSupabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? rawSupabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'devvault_supabase_auth',
    },
  }
)

export interface AuthUser {
  id: string
  email?: string
  name: string
  role: 'owner' | 'user'
}

export interface OwnerMetrics {
  totalUsers: number
  totalProjects: number
  totalQuestions: number
  totalNotes: number
  totalResources: number
  totalTasks: number
  totalActivities: number
  users: Array<{
    id: string
    name: string
    email?: string
    role: 'owner' | 'user'
    createdAt: string
  }>
  recentActivities: Activity[]
}

function mapEntryFromDb(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind: row.kind as Kind,
    title: String(row.title || ''),
    description: String(row.description || ''),
    category: String(row.category || ''),
    status: String(row.status || ''),
    pinned: Boolean(row.pinned),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    data: (row.data as Record<string, string | number | boolean>) || {},
    projectId: row.project_id ? String(row.project_id) : null,
    parentId: row.parent_id ? String(row.parent_id) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
    openedAt: row.opened_at ? String(row.opened_at) : null,
  }
}

function mapActivityFromDb(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    entryId: row.entry_id ? String(row.entry_id) : null,
    kind: row.kind as Kind,
    title: String(row.title || ''),
    action: String(row.action || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
  }
}

export async function fetchUserProfile(userId: string): Promise<AuthUser | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, email')
    .eq('id', userId)
    .single()

  if (error || !data) {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) return null
    const userEmail = authData.user.email?.toLowerCase().trim() || ''
    const defaultRole: 'owner' | 'user' = configuredOwnerEmail && userEmail === configuredOwnerEmail ? 'owner' : 'user'
    const fallbackName = (authData.user.user_metadata?.full_name as string) || authData.user.email?.split('@')[0] || 'Developer'

    const { data: inserted } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: userEmail,
        name: fallbackName,
        role: defaultRole,
        preferences: defaults,
      }, { onConflict: 'id' })
      .select('id, name, role, email')
      .single()

    if (inserted) {
      return {
        id: inserted.id,
        email: inserted.email || authData.user.email,
        name: inserted.name || fallbackName,
        role: (inserted.role as 'owner' | 'user') || defaultRole,
      }
    }

    return {
      id: userId,
      email: authData.user.email,
      name: fallbackName,
      role: defaultRole,
    }
  }

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: (data.role as 'owner' | 'user') || 'user',
  }
}

export async function signUpWithEmail(email: string, password: string, name: string): Promise<{ user: AuthUser; session: Session | null; needsConfirmation: boolean }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
  }

  const trimmedEmail = email.trim().toLowerCase()
  const trimmedName = name.trim() || trimmedEmail.split('@')[0]
  const isOwnerCandidate = Boolean(configuredOwnerEmail && trimmedEmail === configuredOwnerEmail)
  const initialRole: 'owner' | 'user' = isOwnerCandidate ? 'owner' : 'user'

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        full_name: trimmedName,
      },
    },
  })

  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Account creation failed. Please try again.')

  try {
    await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: trimmedEmail,
        name: trimmedName,
        role: initialRole,
        preferences: defaults,
      }, { onConflict: 'id' })
  } catch {
    // profile creation can also be handled by database trigger
  }

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    name: trimmedName,
    role: initialRole,
  }

  return {
    user,
    session: data.session,
    needsConfirmation: !data.session,
  }
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: AuthUser; session: Session }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Incorrect email or password. Please verify and try again.')
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error('Please confirm your email address before signing in.')
    }
    throw new Error(error.message)
  }

  if (!data.user || !data.session) throw new Error('Sign-in failed. Please try again.')

  const profile = await fetchUserProfile(data.user.id)
  const user: AuthUser = profile || {
    id: data.user.id,
    email: data.user.email,
    name: (data.user.user_metadata?.full_name as string) || data.user.email?.split('@')[0] || 'Developer',
    role: 'user',
  }

  return { user, session: data.session }
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function requestPasswordRecovery(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured yet. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.')
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/settings`,
  })
  if (error) throw new Error(error.message)
}

export async function updateUserPassword(password: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured yet.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
}

export async function updateUserProfile(name: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured yet.')
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('Sign in required')

  const trimmed = name.trim()
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', authData.user.id)

  if (profileError) throw new Error(profileError.message)
  await supabase.auth.updateUser({ data: { full_name: trimmed } })
}

export async function loadWorkspace(): Promise<Workspace> {
  if (!isSupabaseConfigured()) {
    return { entries: [], activities: [], preferences: defaults }
  }

  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) return { entries: [], activities: [], preferences: defaults }
  const userId = authData.user.id

  const [entriesRes, activitiesRes, profileRes] = await Promise.all([
    supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (entriesRes.error) throw new Error(entriesRes.error.message)

  const entries: Entry[] = (entriesRes.data || []).map(mapEntryFromDb)
  const activities: Activity[] = (activitiesRes.data || []).map(mapActivityFromDb)
  const preferences: Preferences = profileRes.data?.preferences
    ? (profileRes.data.preferences as Preferences)
    : defaults

  return { entries, activities, preferences }
}

export async function saveEntry(input: EntryInput, id?: string): Promise<{ entry: Entry }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('Sign in to save to your private workspace')
  const userId = authData.user.id

  const validated = entrySchema.parse(input)
  const now = new Date().toISOString()

  if (['Solved', 'Completed'].includes(validated.status)) {
    if (!validated.data.completedAt) validated.data.completedAt = now
  } else {
    delete validated.data.completedAt
  }

  const payload = {
    user_id: userId,
    kind: validated.kind,
    title: validated.title,
    description: validated.description,
    category: validated.category,
    status: validated.status,
    pinned: validated.pinned,
    tags: validated.tags,
    data: validated.data,
    project_id: validated.projectId || null,
    parent_id: validated.parentId || null,
    updated_at: now,
  }

  if (id) {
    const { data, error } = await supabase
      .from('entries')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    const entry = mapEntryFromDb(data)

    await supabase.from('activities').insert({
      user_id: userId,
      entry_id: entry.id,
      kind: entry.kind,
      title: entry.title,
      action: 'Updated',
    })

    return { entry }
  } else {
    const { data, error } = await supabase
      .from('entries')
      .insert({ ...payload, created_at: now })
      .select()
      .single()

    if (error) throw new Error(error.message)
    const entry = mapEntryFromDb(data)

    await supabase.from('activities').insert({
      user_id: userId,
      entry_id: entry.id,
      kind: entry.kind,
      title: entry.title,
      action: 'Created',
    })

    return { entry }
  }
}

export async function deleteEntry(id: string): Promise<{ deleted: string }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('Sign in required')
  const userId = authData.user.id

  const { data: existing } = await supabase
    .from('entries')
    .select('id, kind, title')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  if (existing) {
    await supabase.from('activities').insert({
      user_id: userId,
      kind: existing.kind,
      title: existing.title,
      action: 'Deleted',
    })
  }

  return { deleted: id }
}

export async function openEntry(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) return

  await supabase
    .from('entries')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', authData.user.id)
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) return

  const parsed = preferencesSchema.parse(preferences)
  await supabase
    .from('profiles')
    .update({ preferences: parsed, updated_at: new Date().toISOString() })
    .eq('id', authData.user.id)
}

export async function importEntries(payload: unknown): Promise<{ count: number }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('Sign in required')
  const userId = authData.user.id

  const imported = importSchema.parse(payload)
  let count = 0

  for (const item of imported.entries) {
    const row = {
      user_id: userId,
      kind: item.kind,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      pinned: item.pinned,
      tags: item.tags,
      data: item.data,
      project_id: null,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data } = await supabase.from('entries').insert(row).select('id, kind, title').single()
    if (data) {
      count++
      await supabase.from('activities').insert({
        user_id: userId,
        entry_id: data.id,
        kind: data.kind,
        title: data.title,
        action: 'Imported',
      })
    }
  }

  return { count }
}

export async function fetchOwnerMetrics(): Promise<OwnerMetrics> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('Sign in required')

  const profile = await fetchUserProfile(authData.user.id)
  if (profile?.role !== 'owner') {
    throw new Error('Access denied: Owner privileges required.')
  }

  const [profilesRes, entriesRes, activitiesRes] = await Promise.all([
    supabase.from('profiles').select('id, name, email, role, created_at').order('created_at', { ascending: false }),
    supabase.from('entries').select('id, kind'),
    supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(20),
  ])

  const profilesList = profilesRes.data || []
  const allEntries = entriesRes.data || []
  const recentActivities: Activity[] = (activitiesRes.data || []).map(mapActivityFromDb)

  const counts: Record<Kind, number> = {
    project: 0,
    question: 0,
    note: 0,
    resource: 0,
    task: 0,
  }

  for (const entry of allEntries) {
    if (entry.kind in counts) {
      counts[entry.kind as Kind]++
    }
  }

  return {
    totalUsers: profilesList.length,
    totalProjects: counts.project,
    totalQuestions: counts.question,
    totalNotes: counts.note,
    totalResources: counts.resource,
    totalTasks: counts.task,
    totalActivities: recentActivities.length,
    users: profilesList.map(p => ({
      id: p.id,
      name: p.name || 'Unnamed Developer',
      email: p.email,
      role: (p.role as 'owner' | 'user') || 'user',
      createdAt: p.created_at,
    })),
    recentActivities,
  }
}

export async function updateUserRoleByOwner(targetUserId: string, newRole: 'owner' | 'user'): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.')
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) throw new Error('Sign in required')

  const currentProfile = await fetchUserProfile(authData.user.id)
  if (currentProfile?.role !== 'owner') {
    throw new Error('Access denied: Only an owner can modify roles.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) throw new Error(error.message)
}
