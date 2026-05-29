import { NextResponse } from 'next/server'
import { consumeAuthToken, markEmailVerified } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const userId = await consumeAuthToken(token, 'verify')
    if (!userId) {
      return NextResponse.json({ error: 'This verification link is invalid or has expired' }, { status: 400 })
    }

    await markEmailVerified(userId)
    return NextResponse.json({ message: 'Email verified. You can now sign in.' })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
  }
}
