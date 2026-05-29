import { NextResponse } from 'next/server'
import { createUser, getUserByEmail, createAuthToken } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const user = await createUser(email, password)
    const token = await createAuthToken(user.id, 'verify')
    await sendVerificationEmail(user.email, token)

    return NextResponse.json(
      { message: 'Account created. Check your email to verify your address.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
