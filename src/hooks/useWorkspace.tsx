import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { toast } from 'sonner'
import { defaults, type Entry, type Kind, type Workspace, type Preferences } from '../types'
import { loadWorkspace, saveEntry, deleteEntry, openEntry, savePreferences } from '../services/workspace'
import { 
  supabase, 
  fetchUserProfile, 
  signOut as supabaseSignOut, 
  isSupabaseConfigured,
  type AuthUser 
} from '../lib/supabase'
import type { EntryInput } from '../lib/validation'

export type User = AuthUser

interface ContextValue extends Workspace {
  user: User | null
  isOwner: boolean
  loading: boolean
  error: string
  authOpen: boolean
  recovery: boolean
  setAuthOpen: (open: boolean) => void
  setRecovery: (value: boolean) => void
  editor: { kind: Kind; entry?: Entry } | null
  setEditor: (value: { kind: Kind; entry?: Entry } | null) => void
  add: (kind: Kind) => void
  save: (input: EntryInput, id?: string) => Promise<Entry>
  remove: (entry: Entry) => Promise<void>
  update: (entry: Entry, changes: Partial<Entry>) => Promise<void>
  duplicate: (entry: Entry) => Promise<void>
  refresh: () => Promise<void>
  markOpened: (entry: Entry) => void
  changePreferences: (changes: Partial<Preferences>) => Promise<void>
  signOutUser: () => Promise<void>
  motionDisabled: boolean
}

const Context = createContext<ContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const userRef = useRef<User | null>(null)
  const sessionVersion = useRef(0)
  const loadVersion = useRef(0)
  const [workspace, setWorkspace] = useState<Workspace>({ entries: [], activities: [], preferences: defaults })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [editor, setEditor] = useState<ContextValue['editor']>(null)
  const [systemReduced, setSystemReduced] = useState(false)
  const [systemDark, setSystemDark] = useState(true)

  const isOwner = user?.role === 'owner'

  const refresh = useCallback(async () => {
    const current = userRef.current
    if (!current) {
      setWorkspace({ entries: [], activities: [], preferences: defaults })
      setLoading(false)
      return
    }
    const session = sessionVersion.current
    const request = ++loadVersion.current
    const isCurrent = () => userRef.current?.id === current.id && sessionVersion.current === session && loadVersion.current === request

    try {
      const result = await loadWorkspace()
      if (isCurrent()) { 
        setWorkspace(result)
        setError('') 
      }
    } catch (problem) {
      if (isCurrent()) {
        setError(problem instanceof Error ? problem.message : 'Unable to load your workspace')
      }
    } finally { 
      if (isCurrent()) setLoading(false) 
    }
  }, [])

  useEffect(() => {
    let active = true

    const acceptUser = (next: User | null) => {
      if (!active) return
      const previous = userRef.current?.id
      userRef.current = next
      setUser(next)

      if (previous !== next?.id) {
        sessionVersion.current += 1
        loadVersion.current += 1
        setWorkspace({ entries: [], activities: [], preferences: defaults })
        setError('')
        if (previous) { 
          setEditor(null)
          setRecovery(false) 
        }
      }

      if (next) { 
        if (previous !== next.id) { 
          setLoading(true)
          void refresh() 
        } 
      } else {
        setLoading(false)
      }
    }

    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        if (active) acceptUser(profile)
      } else {
        if (active) acceptUser(null)
      }
    }).catch(() => {
      if (active) setLoading(false)
    })

    // 2. Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return

      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true)
        setAuthOpen(true)
      }

      if (event === 'SIGNED_OUT' || !session) {
        acceptUser(null)
      } else if (session?.user) {
        const profile = await fetchUserProfile(session.user.id)
        if (active) acceptUser(profile)
      }
    })

    return () => { 
      active = false
      subscription.unsubscribe() 
    }
  }, [refresh])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const dark = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystem = () => { 
      setSystemReduced(reduced.matches)
      setSystemDark(dark.matches) 
    }
    updateSystem()
    reduced.addEventListener('change', updateSystem)
    dark.addEventListener('change', updateSystem)
    return () => { 
      reduced.removeEventListener('change', updateSystem)
      dark.removeEventListener('change', updateSystem) 
    }
  }, [])

  const motionDisabled = workspace.preferences.reducedMotion || systemReduced

  useEffect(() => {
    document.documentElement.dataset.theme = workspace.preferences.theme === 'system' 
      ? (systemDark ? 'dark' : 'light') 
      : workspace.preferences.theme
    document.documentElement.dataset.reducedMotion = String(motionDisabled)
  }, [workspace.preferences.theme, systemDark, motionDisabled])

  const requireUser = () => {
    if (!userRef.current) { 
      setAuthOpen(true)
      throw new Error('Sign in to save to your private workspace') 
    }
  }

  const save = async (input: EntryInput, id?: string) => {
    requireUser()
    const result = await saveEntry(input, id)
    if (userRef.current?.id === result.entry.userId) {
      setWorkspace(current => ({
        ...current,
        entries: id 
          ? current.entries.map(entry => entry.id === id ? result.entry : entry) 
          : [result.entry, ...current.entries]
      }))
    }
    await refresh()
    toast.success(id ? 'Changes saved' : 'Added to your universe')
    return result.entry
  }

  const update = async (entry: Entry, changes: Partial<Entry>) => { 
    await save({ ...entry, ...changes }, entry.id) 
  }

  const remove = async (entry: Entry) => {
    requireUser()
    await deleteEntry(entry.id)
    if (userRef.current?.id === entry.userId) {
      setWorkspace(current => ({
        ...current,
        entries: current.entries.filter(record => record.id !== entry.id)
      }))
    }
    await refresh()
    toast.success(`${entry.title} deleted`)
  }

  const duplicate = async (entry: Entry) => { 
    await save({ ...entry, title: `${entry.title.slice(0, 150)} (copy)`, pinned: false }) 
  }

  const markOpened = (entry: Entry) => {
    if (!userRef.current) return
    void openEntry(entry.id).then(() => {
      setWorkspace(current => ({
        ...current,
        entries: current.entries.map(record => 
          record.id === entry.id ? { ...record, openedAt: new Date().toISOString() } : record
        )
      }))
    }).catch(() => {})
  }

  const changePreferences = async (changes: Partial<Preferences>) => {
    const next = { ...workspace.preferences, ...changes }
    const ownerId = userRef.current?.id
    if (ownerId) await savePreferences(next)
    if (ownerId === userRef.current?.id) setWorkspace(current => ({ ...current, preferences: next }))
  }

  const signOutUser = async () => {
    try {
      await supabaseSignOut()
      userRef.current = null
      setUser(null)
      setWorkspace({ entries: [], activities: [], preferences: defaults })
      toast.success('Signed out securely')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign out failed')
    }
  }

  return (
    <Context.Provider value={{
      ...workspace,
      user,
      isOwner,
      loading,
      error,
      authOpen,
      recovery,
      setAuthOpen,
      setRecovery,
      editor,
      setEditor,
      add: kind => setEditor({ kind }),
      save,
      update,
      remove,
      duplicate,
      refresh,
      markOpened,
      changePreferences,
      signOutUser,
      motionDisabled
    }}>
      {children}
    </Context.Provider>
  )
}

export function useWorkspace() { 
  const value = useContext(Context)
  if (!value) throw new Error('Workspace provider is missing')
  return value 
}
