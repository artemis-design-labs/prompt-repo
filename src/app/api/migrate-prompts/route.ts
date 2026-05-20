import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

interface PromptRow {
  id: string
  title: string
  content: string
  folderId: string
}

interface TagRow {
  id: string
  name: string
}

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
    }

    const sql = neon(databaseUrl)

    // Get all prompts
    const prompts = await sql`
      SELECT id, title, content, folder_id as "folderId"
      FROM prompts
      ORDER BY created_at DESC
    ` as PromptRow[]

    // Get tags for each prompt
    const promptsWithTags = await Promise.all(
      prompts.map(async (prompt) => {
        const tags = await sql`
          SELECT t.name FROM tags t
          JOIN prompt_tags pt ON t.id = pt.tag_id
          WHERE pt.prompt_id = ${prompt.id}
        `
        return {
          ...prompt,
          tags: tags.map((t: { name: string }) => t.name)
        }
      })
    )

    // Check if Prompts notebook exists
    const existingNotebook = await sql`
      SELECT id, name FROM notebooks WHERE LOWER(name) = 'prompts'
    `

    return NextResponse.json({
      message: 'Migration preview. POST to execute.',
      promptsToMigrate: promptsWithTags.length,
      prompts: promptsWithTags,
      targetNotebook: existingNotebook[0] || { id: null, name: 'Will create "Prompts" notebook' }
    })
  } catch (error) {
    console.error('Error previewing prompt migration:', error)
    return NextResponse.json(
      { error: 'Failed to preview migration', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
    }

    const sql = neon(databaseUrl)

    // Step 1: Find or create the "Prompts" notebook
    let notebookId: string
    const existingNotebook = await sql`
      SELECT id FROM notebooks WHERE LOWER(name) = 'prompts'
    `

    if (existingNotebook.length > 0) {
      notebookId = existingNotebook[0].id as string
    } else {
      // Create the Prompts notebook
      notebookId = generateId()
      await sql`
        INSERT INTO notebooks (id, name, description, type)
        VALUES (${notebookId}, 'Prompts', 'Repository of all prompts', 'repository')
      `
    }

    // Step 2: Get all prompts
    const prompts = await sql`
      SELECT id, title, content, folder_id as "folderId"
      FROM prompts
      ORDER BY created_at DESC
    ` as PromptRow[]

    // Step 3: Convert each prompt to a note
    const migratedNotes: Array<{ id: string; title: string; originalPromptId: string }> = []

    for (const prompt of prompts) {
      const noteId = generateId()

      // Get the next position
      const maxPos = await sql`
        SELECT COALESCE(MAX(position), -1) + 1 as next_pos
        FROM notes
        WHERE notebook_id = ${notebookId}
      `
      const position = maxPos[0]?.next_pos ?? 0

      // Create the note
      await sql`
        INSERT INTO notes (id, notebook_id, title, content, type, template, position)
        VALUES (${noteId}, ${notebookId}, ${prompt.title}, ${prompt.content}, 'prompt', 'prompt', ${position})
      `

      // Copy tags from prompt to note
      const promptTags = await sql`
        SELECT t.id, t.name FROM tags t
        JOIN prompt_tags pt ON t.id = pt.tag_id
        WHERE pt.prompt_id = ${prompt.id}
      ` as TagRow[]

      for (const tag of promptTags) {
        await sql`
          INSERT INTO note_tags (note_id, tag_id)
          VALUES (${noteId}, ${tag.id})
          ON CONFLICT DO NOTHING
        `
      }

      migratedNotes.push({
        id: noteId,
        title: prompt.title,
        originalPromptId: prompt.id
      })
    }

    // Step 4: Delete original prompts (optional - uncomment if desired)
    // for (const prompt of prompts) {
    //   await sql`DELETE FROM prompts WHERE id = ${prompt.id}`
    // }

    return NextResponse.json({
      success: true,
      summary: {
        notebookId,
        notebookName: 'Prompts',
        promptsMigrated: migratedNotes.length,
        migratedNotes
      }
    })
  } catch (error) {
    console.error('Error executing prompt migration:', error)
    return NextResponse.json(
      { error: 'Failed to execute migration', details: String(error) },
      { status: 500 }
    )
  }
}
