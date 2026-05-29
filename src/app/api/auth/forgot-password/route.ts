import { NextResponse } from 'next/server'
import { getUserByEmail, createAuthToken } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

export const runtime = 'nodejs'

// Always return a generic response to avoid leaking which emails are registered.
const GENERIC = { message: 'If an account exists for that email, a reset link has been sent.' }

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (typeof email === 'string' && email) {
      const user = await getUserByEmail(email)
      if (user) {
        const token = await createAuthToken(user.id, 'reset')
        await sendPasswordResetEmail(user.email, token)
      }
    }
    return NextResponse.json(GENERIC)
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(GENERIC)
  }
}
