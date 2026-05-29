import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireUser, isAuthResponse } from '@/lib/auth'

// Information Architecture from Whimsical
// Maps existing notebook names to target IA notebooks
const NOTEBOOK_NAME_MAPPING: Record<string, string> = {
  // Health-related → spreadsheet-health
  'health': 'spreadsheet-health',
  // Financial-related → spreadsheet-financial
  'financial': 'spreadsheet-financial',
  // Task/Productivity-related → spreadsheet-productivity
  'tasks': 'spreadsheet-productivity',
  // Prompts → repository-prompts
  'prompts': 'repository-prompts',
  // Travel → notebook-general (Travel Itinerary is under Notebook type)
  'travel': 'notebook-general',
  // Social Media/Scripts → notebook-general (Scripts is under Notebook type)
  'social media': 'notebook-general',
  // Links/Text content → notebook-general (Text is under Notebook type)
  'links': 'notebook-general',
  // Books → book-writing
  'the economist': 'book-writing',
  // Business/Competitive Analysis → spreadsheet-business
  'artemis design labs': 'spreadsheet-business',
  // UX/Research → spreadsheet-business (closest match)
  'ux glossary': 'spreadsheet-business',
}

// Title keywords that indicate specific categories
const TITLE_KEYWORDS: Record<string, string> = {
  'nutrition': 'spreadsheet-health',
  'protein': 'spreadsheet-health',
  'workout': 'spreadsheet-health',
  'supplement': 'spreadsheet-health',
  'smoothie': 'spreadsheet-health',
  'macro': 'spreadsheet-health',
  'expense': 'spreadsheet-financial',
  'budget': 'spreadsheet-financial',
  'task': 'spreadsheet-productivity',
  'habit': 'spreadsheet-productivity',
  'competitive analysis': 'spreadsheet-business',
  'tiktok': 'notebook-general',
  'script': 'notebook-general',
  'trip': 'notebook-general',
  'travel': 'notebook-general',
}

// Notebooks to create based on IA
const NOTEBOOKS_TO_CREATE = [
  { id: 'notebook-general', name: 'Notebook', type: 'notebook' },
  { id: 'repository-prompts', name: 'Repository', type: 'repository' },
  { id: 'book-writing', name: 'Book', type: 'book' },
  // Spreadsheet sub-categories as separate notebooks
  { id: 'spreadsheet-health', name: 'Health', type: 'spreadsheet' },
  { id: 'spreadsheet-financial', name: 'Financial', type: 'spreadsheet' },
  { id: 'spreadsheet-productivity', name: 'Productivity', type: 'spreadsheet' },
  { id: 'spreadsheet-business', name: 'Business', type: 'spreadsheet' },
  { id: 'spreadsheet-blank', name: 'Blank', type: 'spreadsheet' }
]

interface NoteInfo {
  id: string
  notebookId: string
  title: string
  type: string
  template: string | null
}

interface NotebookInfo {
  id: string
  name: string
  type: string
}

function getTargetNotebook(
  note: NoteInfo,
  currentNotebook: NotebookInfo | undefined,
  allNotebooks: NotebookInfo[]
): string {
  const notebookName = currentNotebook?.name?.toLowerCase() || ''
  const noteTitle = note.title?.toLowerCase() || ''
  const noteType = note.type
  const template = note.template?.toLowerCase() || ''

  // 1. First check if the current notebook is already one of our IA notebooks
  const iaNotebookIds = NOTEBOOKS_TO_CREATE.map(n => n.id)
  if (iaNotebookIds.includes(note.notebookId)) {
    return note.notebookId // Keep it where it is
  }

  // 2. Check template (prompt template → repository)
  if (template === 'prompt' || noteType === 'prompt') {
    return 'repository-prompts'
  }

  // 3. Check book type
  if (noteType === 'book') {
    return 'book-writing'
  }

  // 4. Map based on current notebook name
  for (const [keyword, target] of Object.entries(NOTEBOOK_NAME_MAPPING)) {
    if (notebookName.includes(keyword)) {
      return target
    }
  }

  // 5. Check title keywords for more specific categorization
  for (const [keyword, target] of Object.entries(TITLE_KEYWORDS)) {
    if (noteTitle.includes(keyword)) {
      return target
    }
  }

  // 6. Default based on note type
  if (noteType === 'spreadsheet') {
    return 'spreadsheet-blank'
  }
  if (noteType === 'tiktok') {
    return 'notebook-general'
  }

  // 7. Default to notebook-general for text and other types
  return 'notebook-general'
}

export async function GET() {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
    }

    const sql = neon(databaseUrl)

    // Get current notebooks and notes
    const [notebooksRaw, notesRaw] = await Promise.all([
      sql`SELECT id, name, type FROM notebooks ORDER BY created_at`,
      sql`
        SELECT id, notebook_id as "notebookId", title, type, template
        FROM notes
        ORDER BY created_at
      `
    ])

    const notebooks = notebooksRaw as NotebookInfo[]
    const notes = notesRaw as NoteInfo[]

    // Create a map for quick notebook lookup
    const notebookMap = new Map(notebooks.map(nb => [nb.id, nb]))

    // Preview the migration
    const migration = {
      currentState: {
        notebooks: notebooks,
        notes: notes.map(n => ({
          id: n.id,
          title: n.title,
          notebookId: n.notebookId,
          currentNotebook: notebookMap.get(n.notebookId)?.name || 'Unknown',
          type: n.type,
          template: n.template
        }))
      },
      notebooksToCreate: NOTEBOOKS_TO_CREATE.filter(
        nb => !notebooks.some(existing => existing.id === nb.id)
      ),
      notesToMove: notes.map(note => {
        const currentNotebook = notebookMap.get(note.notebookId)
        const targetNotebookId = getTargetNotebook(note, currentNotebook, notebooks)
        const targetNotebook = NOTEBOOKS_TO_CREATE.find(n => n.id === targetNotebookId)
        return {
          id: note.id,
          title: note.title,
          currentNotebookId: note.notebookId,
          currentNotebookName: currentNotebook?.name || 'Unknown',
          targetNotebookId,
          targetNotebookName: targetNotebook?.name || targetNotebookId,
          template: note.template,
          type: note.type,
          willMove: note.notebookId !== targetNotebookId
        }
      }).filter(n => n.willMove)
    }

    return NextResponse.json({
      message: 'Migration preview. POST to execute.',
      migration
    })
  } catch (error) {
    console.error('Error previewing migration:', error)
    return NextResponse.json(
      { error: 'Failed to preview migration', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
    }

    const sql = neon(databaseUrl)

    // Step 1: Create notebooks if they don't exist
    const createdNotebooks: string[] = []
    for (const notebook of NOTEBOOKS_TO_CREATE) {
      const existing = await sql`SELECT id FROM notebooks WHERE id = ${notebook.id}`
      if (existing.length === 0) {
        await sql`
          INSERT INTO notebooks (id, name, type)
          VALUES (${notebook.id}, ${notebook.name}, ${notebook.type})
        `
        createdNotebooks.push(notebook.id)
      }
    }

    // Step 2: Get all notebooks and notes
    const [notebooksRaw, notesRaw] = await Promise.all([
      sql`SELECT id, name, type FROM notebooks`,
      sql`SELECT id, notebook_id as "notebookId", title, type, template FROM notes`
    ])

    const notebooks = notebooksRaw as NotebookInfo[]
    const notes = notesRaw as NoteInfo[]
    const notebookMap = new Map(notebooks.map(nb => [nb.id, nb]))

    // Step 3: Move notes to appropriate notebooks
    const movedNotes: Array<{ id: string; title: string; from: string; fromName: string; to: string; toName: string }> = []
    for (const note of notes) {
      const currentNotebook = notebookMap.get(note.notebookId)
      const targetNotebookId = getTargetNotebook(note, currentNotebook, notebooks)
      const targetNotebook = NOTEBOOKS_TO_CREATE.find(n => n.id === targetNotebookId)

      if (note.notebookId !== targetNotebookId) {
        // Get the next position in target notebook
        const maxPos = await sql`
          SELECT COALESCE(MAX(position), -1) + 1 as next_pos
          FROM notes
          WHERE notebook_id = ${targetNotebookId}
        `
        const position = maxPos[0]?.next_pos ?? 0

        await sql`
          UPDATE notes
          SET notebook_id = ${targetNotebookId}, position = ${position}, updated_at = NOW()
          WHERE id = ${note.id}
        `
        movedNotes.push({
          id: note.id,
          title: note.title,
          from: note.notebookId,
          fromName: currentNotebook?.name || 'Unknown',
          to: targetNotebookId,
          toName: targetNotebook?.name || targetNotebookId
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        notebooksCreated: createdNotebooks.length,
        notebooksCreatedIds: createdNotebooks,
        notesMoved: movedNotes.length,
        movedNotes
      }
    })
  } catch (error) {
    console.error('Error executing migration:', error)
    return NextResponse.json(
      { error: 'Failed to execute migration', details: String(error) },
      { status: 500 }
    )
  }
}
