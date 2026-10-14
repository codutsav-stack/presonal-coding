import { useState } from 'react'
import { login, signup, updateUser, requestPasswordRecovery } from '@netlify/identity'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowRight, Code2, ShieldCheck } from 'lucide-react'
import { Modal } from './ui/Modal'
import { useWorkspace } from '../hooks/useWorkspace'

export function AuthDialog() {
  const { authOpen, setAuthOpen, recovery, setRecovery } = useWorkspace()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const schema = z.object({ email: recovery ? z.string() : z.email('Enter a valid email'), password: mode === 'forgot' ? z.string() : z.string().min(8, 'Use at least 8 characters'), name: z.string().max(80) })
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', name: '' } })
  const submit = form.handleSubmit(async values => {
    setBusy(true); setError('')
    try {
      if (recovery) { await updateUser({ password: values.password }); setRecovery(false); toast.success('Password updated'); setAuthOpen(false) }
      else if (mode === 'forgot') { await requestPasswordRecovery(values.email); toast.success('Check your email for a password reset link'); setMode('login') }
      else if (mode === 'signup') {
        const created = await signup(values.email, values.password, { full_name: values.name })
        if (created.confirmedAt) { toast.success('Your universe is ready'); setAuthOpen(false) } else { toast.success('Check your email to confirm your account'); setMode('login') }
      } else { await login(values.email, values.password); form.reset(); toast.success('Welcome to your workspace'); setAuthOpen(false) }
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Sign-in failed') } finally { setBusy(false) }
  })
  return <Modal open={authOpen} onClose={() => { setAuthOpen(false); form.reset(); setError('') }} title={recovery ? 'Choose a new password' : mode === 'signup' ? 'Make space for your ideas.' : mode === 'forgot' ? 'Find your way back.' : 'Welcome to your universe.'} description="Your workspace is private. Your ideas belong to you." className="auth-modal">
    <div className="auth-logo"><Code2 size={27} /></div>
    <form onSubmit={submit} className="auth-form">
      {mode === 'signup' && !recovery && <label>Your name<input {...form.register('name')} autoComplete="name" placeholder="What should we call you?" /></label>}
      {!recovery && <label>Email address<input {...form.register('email')} type="email" autoComplete="email" placeholder="you@example.com" />{form.formState.errors.email && <span className="field-error">{form.formState.errors.email.message}</span>}</label>}
      {mode !== 'forgot' && <label>{recovery ? 'New password' : 'Password'}<input {...form.register('password')} type="password" autoComplete={mode === 'signup' || recovery ? 'new-password' : 'current-password'} placeholder="At least 8 characters" />{form.formState.errors.password && <span className="field-error">{form.formState.errors.password.message}</span>}</label>}
      {error && <div className="error-banner" role="alert">{error}</div>}
      <button className="button primary" disabled={busy}>{busy ? 'Connecting…' : recovery ? 'Update password' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}<ArrowRight size={16} /></button>
    </form>
    {!recovery && <div className="auth-switch"><button onClick={() => { setMode(mode === 'signup' || mode === 'forgot' ? 'login' : 'signup'); setError(''); form.clearErrors() }}>{mode === 'forgot' ? 'Back to sign in' : mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>{mode === 'login' && <button onClick={() => { setMode('forgot'); setError(''); form.clearErrors() }}>Forgot password?</button>}</div>}
    <div className="auth-security"><ShieldCheck size={14} />Secured with Netlify Identity. No demo data.</div>
  </Modal>
}
