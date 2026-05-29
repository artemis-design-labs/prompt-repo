import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession, SESSION_COOKIE } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (token) {
      await deleteSession(token)
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    return res
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}
