'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [message, setMessage] = useState('Verifying your email…')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setStatus('success')
          setMessage(data.message || 'Email verified.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong. Please try again.')
      })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-xl">
        <h1 className="mb-3 text-xl font-semibold text-white">Email verification</h1>
        <p className={`mb-4 text-sm ${status === 'error' ? 'text-red-400' : status === 'success' ? 'text-green-400' : 'text-zinc-400'}`}>
          {message}
        </p>
        <Link href="/" className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
          Go to sign in
        </Link>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-900" />}>
      <VerifyInner />
    </Suspense>
  )
}
