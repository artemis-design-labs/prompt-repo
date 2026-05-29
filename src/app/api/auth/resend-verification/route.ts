import { NextResponse } from 'next/server'
import { getUserByEmail, createAuthToken } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'

export const runtime = 'nodejs'

const GENERIC = { message: 'If that account exists and is unverified, a new link has been sent.' }

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (typeof email === 'string' && email) {
      const user = await getUserByEmail(email)
      if (user && !user.emailVerified) {
        const token = await createAuthToken(user.id, 'verify')
        await sendVerificationEmail(user.email, token)
      }
    }
    return NextResponse.json(GENERIC)
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(GENERIC)
  }
}
