import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth
    const userId = auth.id

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
    }

    const sql = neon(databaseUrl)

    // Fetch all data scoped to the current user
    const [folders, prompts, tags, tagCategories, notebooks, notes] = await Promise.all([
      sql`
        SELECT id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
        FROM folders
        WHERE user_id = ${userId}
        ORDER BY name
      `,
      sql`
        SELECT
          p.id,
          p.title,
          p.content,
          p.folder_id as "folderId",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          COALESCE(
            array_agg(t.name) FILTER (WHERE t.name IS NOT NULL),
            ARRAY[]::varchar[]
          ) as tags
        FROM prompts p
        LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.user_id = ${userId}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `,
      sql`SELECT name FROM tags WHERE user_id = ${userId} ORDER BY name`,
      sql`
        SELECT
          tc.id,
          tc.name,
          COALESCE(
            array_agg(t.name) FILTER (WHERE t.name IS NOT NULL),
            ARRAY[]::varchar[]
          ) as tags
        FROM tag_categories tc
        LEFT JOIN category_tags ct ON tc.id = ct.category_id
        LEFT JOIN tags t ON ct.tag_id = t.id
        WHERE tc.user_id = ${userId}
        GROUP BY tc.id
        ORDER BY tc.name
      `,
      sql`
        SELECT id, name, type, created_at as "createdAt", updated_at as "updatedAt"
        FROM notebooks
        WHERE user_id = ${userId}
        ORDER BY created_at
      `,
      sql`
        SELECT
          n.id,
          n.notebook_id as "notebookId",
          n.title,
          n.content,
          n.type,
          n.template,
          n.created_at as "createdAt",
          n.updated_at as "updatedAt",
          COALESCE(
            array_agg(t.name) FILTER (WHERE t.name IS NOT NULL),
            ARRAY[]::varchar[]
          ) as tags
        FROM notes n
        LEFT JOIN note_tags nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        WHERE n.user_id = ${userId}
        GROUP BY n.id
        ORDER BY n.created_at DESC
      `
    ])

    return NextResponse.json({
      folders,
      prompts,
      tags: tags.map(t => t.name),
      tagCategories,
      notebooks,
      notes
    })
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    )
  }
}
