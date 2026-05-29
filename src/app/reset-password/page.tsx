'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const inputClass =
  'w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
const buttonClass =
  'w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50'

function ResetInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!token) {
      setError('Missing reset token.')
      return
    }
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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <h1 className="mb-3 text-xl font-semibold text-white">Choose a new password</h1>
        {done ? (
          <div className="text-center">
            <p className="mb-4 text-sm text-green-400">Password updated. You can now sign in.</p>
            <Link href="/" className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && (
              <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <input className={inputClass} type="password" placeholder="New password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
              <input className={inputClass} type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
              <button className={buttonClass} type="submit" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-900" />}>
      <ResetInner />
    </Suspense>
  )
}
