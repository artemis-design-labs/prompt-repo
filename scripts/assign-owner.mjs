// One-time migration: creates the owner account and assigns all existing
// (orphaned) data to it. Run AFTER migrate-auth-schema.mjs.
//
//   OWNER_EMAIL=you@example.com OWNER_PASSWORD='secret' node scripts/assign-owner.mjs
//
// The password is read from the environment and never stored in plaintext.
// Idempotent: re-running only re-assigns rows that are still unowned.
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const content = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
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
const email = (process.env.OWNER_EMAIL || process.argv[2] || '').trim().toLowerCase()
const password = process.env.OWNER_PASSWORD || process.argv[3] || ''

if (!databaseUrl) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}
if (!email || !password) {
  console.error('Provide OWNER_EMAIL and OWNER_PASSWORD (env vars or as args).')
  process.exit(1)
}

const sql = neon(databaseUrl)

function generateId() {
  return randomBytes(8).toString('hex')
}

async function run() {
  // Find or create the owner user (verified).
  const existing = await sql`SELECT id FROM users WHERE LOWER(email) = ${email}`
  let userId
  if (existing[0]) {
    userId = existing[0].id
    console.log(`Owner already exists (${email}); reusing id ${userId}.`)
  } else {
    userId = generateId()
    const passwordHash = await bcrypt.hash(password, 12)
    await sql`
      INSERT INTO users (id, email, password_hash, email_verified)
      VALUES (${userId}, ${email}, ${passwordHash}, TRUE)
    `
    console.log(`Created owner ${email} (verified) with id ${userId}.`)
  }

  // Assign all orphaned rows to the owner.
  for (const table of ['folders', 'prompts', 'notebooks', 'notes', 'tags', 'tag_categories']) {
    const res = await sql.query(
      `UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`,
      [userId]
    )
    console.log(`  ${table}: assigned ${res.rowCount ?? res.length ?? 0} rows`)
  }

  console.log('Owner assignment complete.')
}

run().catch((err) => {
  console.error('Assignment failed:', err)
  process.exit(1)
})
