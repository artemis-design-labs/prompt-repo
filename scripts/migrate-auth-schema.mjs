// Idempotent schema migration: adds auth tables and per-user ownership.
// Run against the Neon DB referenced by DATABASE_URL (read from .env.local).
//
//   node scripts/migrate-auth-schema.mjs
//
// Safe to run multiple times. Adds:
//   - users, sessions, auth_tokens tables
//   - user_id columns on folders/prompts/notebooks/notes/tags/tag_categories
//   - per-user uniqueness for tags and tag_categories
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  if (process.env.DATABASE_URL) return
  try {
    const envPath = join(__dirname, '..', '.env.local')
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) {
        let val = m[2].trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[m[1]]) process.env[m[1]] = val
      }
    }
  } catch {
    // ignore
  }
}

loadEnv()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set (checked env and .env.local).')
  process.exit(1)
}

const sql = neon(databaseUrl)

async function run() {
  console.log('Creating users table...')
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email))`

  console.log('Creating sessions table...')
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`

  console.log('Creating auth_tokens table...')
  await sql`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id)`

  console.log('Adding user_id columns to data tables...')
  for (const table of ['folders', 'prompts', 'notebooks', 'notes', 'tags', 'tag_categories']) {
    await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE`)
    await sql.query(`CREATE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table}(user_id)`)
  }

  console.log('Switching tags/tag_categories to per-user uniqueness...')
  // Drop the global UNIQUE(name) on tags (constraint name may vary)
  await sql`ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_tags_user_name ON tags(user_id, name)`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_tag_categories_user_name ON tag_categories(user_id, name)`

  console.log('Schema migration complete.')
}

run().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
