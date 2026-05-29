import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const SESSION_COOKIE = 'pr_session'
const SESSION_TTL_DAYS = 30
const VERIFY_TTL_HOURS = 24
const RESET_TTL_HOURS = 1
const BCRYPT_ROUNDS = 12

export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
}

export type AuthTokenType = 'verify' | 'reset'

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(databaseUrl)
}

function generateId(): string {
  return randomBytes(8).toString('hex')
}

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

// ============ PASSWORD ============

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============ USERS ============

export async function getUserByEmail(email: string): Promise<(AuthUser & { passwordHash: string }) | null> {
  const rows = await getSQL()`
    SELECT id, email, password_hash as "passwordHash", email_verified as "emailVerified"
    FROM users WHERE LOWER(email) = ${email.toLowerCase()}
  `
  return (rows[0] as (AuthUser & { passwordHash: string })) ?? null
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const rows = await getSQL()`
    SELECT id, email, email_verified as "emailVerified"
    FROM users WHERE id = ${id}
  `
  return (rows[0] as AuthUser) ?? null
}

export async function createUser(email: string, password: string): Promise<AuthUser> {
  const id = generateId()
  const passwordHash = await hashPassword(password)
  const rows = await getSQL()`
    INSERT INTO users (id, email, password_hash, email_verified)
    VALUES (${id}, ${email.toLowerCase()}, ${passwordHash}, FALSE)
    RETURNING id, email, email_verified as "emailVerified"
  `
  return rows[0] as AuthUser
}

export async function markEmailVerified(userId: string): Promise<void> {
  await getSQL()`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = ${userId}`
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password)
  await getSQL()`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${userId}`
}

// ============ SESSIONS ============

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await getSQL()`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt.toISOString()})
  `
  return { token, expiresAt }
}

export async function getUserBySession(token: string): Promise<AuthUser | null> {
  const rows = await getSQL()`
    SELECT u.id, u.email, u.email_verified as "emailVerified"
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `
  return (rows[0] as AuthUser) ?? null
}

export async function deleteSession(token: string): Promise<void> {
  await getSQL()`DELETE FROM sessions WHERE token = ${token}`
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await getSQL()`DELETE FROM sessions WHERE user_id = ${userId}`
}

// ============ CURRENT USER (from cookie) ============

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return getUserBySession(token)
}

// For use in API routes: returns the user, or a 401 NextResponse to return early.
export async function requireUser(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return user
}

export function isAuthResponse(value: AuthUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  }
}

// ============ AUTH TOKENS (verify / reset) ============

export async function createAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = generateToken()
  const hours = type === 'verify' ? VERIFY_TTL_HOURS : RESET_TTL_HOURS
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
  await getSQL()`
    INSERT INTO auth_tokens (token, user_id, type, expires_at)
    VALUES (${token}, ${userId}, ${type}, ${expiresAt.toISOString()})
  `
  return token
}

// Validates and single-use consumes a token. Returns the userId on success.
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  const rows = await getSQL()`
    UPDATE auth_tokens
    SET used_at = NOW()
    WHERE token = ${token}
      AND type = ${type}
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING user_id as "userId"
  `
  return (rows[0]?.userId as string) ?? null
}
