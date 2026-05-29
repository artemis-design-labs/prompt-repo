import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM || 'Prompt Repository <onboarding@resend.dev>'

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    'http://localhost:3000'
  )
}

async function send(to: string, subject: string, html: string, devLabel: string, link: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // No provider configured — log the link so the flow still works locally.
    console.log(`[email:${devLabel}] -> ${to}\n${link}`)
    return
  }
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) {
    console.error(`[email:${devLabel}] Resend error:`, error)
    throw new Error('Failed to send email')
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${getAppUrl()}/verify?token=${token}`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>Verify your email</h2>
      <p>Welcome to Prompt Repository. Confirm your email address to activate your account.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Verify email</a></p>
      <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${link}</p>
      <p style="color:#999;font-size:12px">This link expires in 24 hours.</p>
    </div>
  `
  await send(email, 'Verify your email', html, 'verify', link)
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${getAppUrl()}/reset-password?token=${token}`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>Reset your password</h2>
      <p>We received a request to reset your password. Click below to choose a new one.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Reset password</a></p>
      <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${link}</p>
      <p style="color:#999;font-size:12px">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    </div>
  `
  await send(email, 'Reset your password', html, 'reset', link)
}
