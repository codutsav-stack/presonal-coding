import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowRight, Code2, ShieldCheck, AlertCircle } from 'lucide-react'
import { Modal } from './ui/Modal'
import { useWorkspace } from '../hooks/useWorkspace'
import { 
  signInWithEmail, 
  signUpWithEmail, 
  requestPasswordRecovery, 
  updateUserPassword,
  isSupabaseConfigured 
} from '../lib/supabase'

export function AuthDialog() {
  const { authOpen, setAuthOpen, recovery, setRecovery } = useWorkspace()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const schema = z.object({
    email: recovery ? z.string() : z.string().trim().email('Enter a valid email address'),
    password: mode === 'forgot' ? z.string() : z.string().min(8, 'Use at least 8 characters'),
    name: z.string().max(80).default(''),
  })

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '' },
  })

  const submit = form.handleSubmit(async values => {
    setBusy(true)
    setError('')
    try {
      if (!isSupabaseConfigured()) {
        throw new Error(
          'Supabase credentials are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
        )
      }

      if (recovery) {
        await updateUserPassword(values.password)
        setRecovery(false)
        toast.success('Password updated successfully')
        setAuthOpen(false)
      } else if (mode === 'forgot') {
        await requestPasswordRecovery(values.email)
        toast.success('Check your email for a password reset link')
        setMode('login')
      } else if (mode === 'signup') {
        const result = await signUpWithEmail(values.email, values.password, values.name)
        if (result.needsConfirmation) {
          toast.success('Check your email to confirm your account, then sign in')
          setMode('login')
        } else {
          toast.success('Your workspace is ready! Welcome to DevVault.')
          form.reset()
          setAuthOpen(false)
        }
      } else {
        await signInWithEmail(values.email, values.password)
        form.reset()
        toast.success('Welcome back to your workspace')
        setAuthOpen(false)
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  })

  return (
    <Modal
      open={authOpen}
      onClose={() => {
        setAuthOpen(false)
        form.reset()
        setError('')
      }}
      title={
        recovery
          ? 'Choose a new password'
          : mode === 'signup'
          ? 'Make space for your ideas.'
          : mode === 'forgot'
          ? 'Find your way back.'
          : 'Welcome to your universe.'
      }
      description="Your workspace is private. Your ideas belong to you."
      className="auth-modal"
    >
      <div className="auth-logo">
        <Code2 size={27} />
      </div>

      {!isSupabaseConfigured() && (
        <div 
          className="error-banner" 
          role="alert" 
          style={{ background: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)', color: '#facc15', fontSize: '0.85rem' }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Setup Required:</strong> Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file. Check <code>.env.example</code> for template.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="auth-form">
        {mode === 'signup' && !recovery && (
          <label>
            Your name
            <input
              {...form.register('name')}
              autoComplete="name"
              placeholder="What should we call you?"
            />
          </label>
        )}

        {!recovery && (
          <label>
            Email address
            <input
              {...form.register('email')}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
            {form.formState.errors.email && (
              <span className="field-error">{form.formState.errors.email.message}</span>
            )}
          </label>
        )}

        {mode !== 'forgot' && (
          <label>
            {recovery ? 'New password' : 'Password'}
            <input
              {...form.register('password')}
              type="password"
              autoComplete={mode === 'signup' || recovery ? 'new-password' : 'current-password'}
              placeholder="At least 8 characters"
            />
            {form.formState.errors.password && (
              <span className="field-error">{form.formState.errors.password.message}</span>
            )}
          </label>
        )}

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <button className="button primary" disabled={busy}>
          {busy
            ? 'Connecting…'
            : recovery
            ? 'Update password'
            : mode === 'signup'
            ? 'Create account'
            : mode === 'forgot'
            ? 'Send reset link'
            : 'Sign in'}
          <ArrowRight size={16} />
        </button>
      </form>

      {!recovery && (
        <div className="auth-switch">
          <button
            onClick={() => {
              setMode(mode === 'signup' || mode === 'forgot' ? 'login' : 'signup')
              setError('')
              form.clearErrors()
            }}
          >
            {mode === 'forgot'
              ? 'Back to sign in'
              : mode === 'signup'
              ? 'Already have an account? Sign in'
              : 'New here? Create an account'}
          </button>
          {mode === 'login' && (
            <button
              onClick={() => {
                setMode('forgot')
                setError('')
                form.clearErrors()
              }}
            >
              Forgot password?
            </button>
          )}
        </div>
      )}

      <div className="auth-security">
        <ShieldCheck size={14} />
        Secured with Supabase Auth & PostgreSQL Row Level Security.
      </div>
    </Modal>
  )
}
