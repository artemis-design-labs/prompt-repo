import { NextResponse } from 'next/server'
import {
  getUserByEmail,
  verifyPassword,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await getUserByEmail(email)
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before signing in', needsVerification: true },
        { status: 403 }
      )
    }

    const { token, expiresAt } = await createSession(user.id)
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, emailVerified: user.emailVerified },
    })
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt))
    return res
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 })
  }
}
