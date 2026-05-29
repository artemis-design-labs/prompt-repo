import { NextResponse } from 'next/server'
import { consumeAuthToken, updateUserPassword, deleteAllUserSessions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const userId = await consumeAuthToken(token, 'reset')
    if (!userId) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 })
    }

    await updateUserPassword(userId, password)
    await deleteAllUserSessions(userId)

    return NextResponse.json({ message: 'Password updated. You can now sign in.' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
