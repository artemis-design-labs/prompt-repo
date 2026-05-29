'use client'

import { useEffect, useState } from 'react'

interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
}

type View = 'login' | 'register' | 'forgot'

const inputClass =
  'w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
const buttonClass =
  'w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [view, setView] = useState<View>('login')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setView('login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-zinc-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4">
        <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <h1 className="mb-1 text-xl font-semibold text-white">Prompt Repository</h1>
          {view === 'login' && (
            <LoginForm onSuccess={setUser} onSwitch={setView} />
          )}
          {view === 'register' && <RegisterForm onSwitch={setView} />}
          {view === 'forgot' && <ForgotForm onSwitch={setView} />}
        </div>
      </div>
    )
  }

  return (
    <>
      <AccountMenu email={user.email} onLogout={handleLogout} />
      {children}
    </>
  )
}

function Message({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  return (
    <div
      className={`mb-3 rounded-md px-3 py-2 text-sm ${
        kind === 'error'
          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
          : 'bg-green-500/10 text-green-400 border border-green-500/30'
      }`}
    >
      {text}
    </div>
  )
}

function LoginForm({
  onSuccess,
  onSwitch,
}: {
  onSuccess: (u: AuthUser) => void
  onSwitch: (v: View) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resent, setResent] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setBusy(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        onSuccess(data.user)
      } else {
        setError(data.error || 'Failed to sign in')
        if (data.needsVerification) setNeedsVerification(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResent(true)
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-4 text-sm text-zinc-400">Sign in to your account</p>
      {error && <Message kind="error" text={error} />}
      {needsVerification && !resent && (
        <button type="button" onClick={resend} className="mb-3 text-sm text-blue-400 hover:underline">
          Resend verification email
        </button>
      )}
      {resent && <Message kind="success" text="Verification email sent." />}
      <div className="space-y-3">
        <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        <button className={buttonClass} type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" onClick={() => onSwitch('forgot')} className="text-zinc-400 hover:text-white">
          Forgot password?
        </button>
        <button type="button" onClick={() => onSwitch('register')} className="text-blue-400 hover:underline">
          Create account
        </button>
      </div>
    </form>
  )
}

function RegisterForm({ onSwitch }: { onSwitch: (v: View) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
      } else {
        setError(data.error || 'Failed to create account')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div>
        <Message kind="success" text="Account created. Check your email to verify your address, then sign in." />
        <button onClick={() => onSwitch('login')} className={buttonClass}>
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-4 text-sm text-zinc-400">Create your account</p>
      {error && <Message kind="error" text={error} />}
      <div className="space-y-3">
        <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input className={inputClass} type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        <input className={inputClass} type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        <button className={buttonClass} type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </div>
      <div className="mt-4 text-center text-sm">
        <button type="button" onClick={() => onSwitch('login')} className="text-blue-400 hover:underline">
          Already have an account? Sign in
        </button>
      </div>
    </form>
  )
}

function ForgotForm({ onSwitch }: { onSwitch: (v: View) => void }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-4 text-sm text-zinc-400">Reset your password</p>
      {done ? (
        <Message kind="success" text="If an account exists for that email, a reset link has been sent." />
      ) : (
        <div className="space-y-3">
          <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <button className={buttonClass} type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </div>
      )}
      <div className="mt-4 text-center text-sm">
        <button type="button" onClick={() => onSwitch('login')} className="text-blue-400 hover:underline">
          Back to sign in
        </button>
      </div>
    </form>
  )
}

function AccountMenu({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed right-4 top-4 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white hover:bg-blue-500"
        title={email}
      >
        {email.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-zinc-700 bg-zinc-800 p-2 shadow-xl">
          <div className="truncate px-2 py-1 text-xs text-zinc-400">{email}</div>
          <button
            onClick={onLogout}
            className="mt-1 w-full rounded px-2 py-1.5 text-left text-sm text-white hover:bg-zinc-700"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
