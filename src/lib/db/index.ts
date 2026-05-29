import { neon } from '@neondatabase/serverless'
import type { Folder, Prompt, TagCategory, Notebook, Note } from '@/types'

// Create SQL connection lazily
function getSQL() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(databaseUrl)
}

// Generate a random ID
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

type SQL = ReturnType<typeof getSQL>

// Upsert a tag for a user and return its id (tags are scoped per user).
async function upsertTag(sql: SQL, userId: string, name: string): Promise<string | null> {
  const lower = name.toLowerCase()
  const id = generateId()
  await sql`
    INSERT INTO tags (id, name, user_id)
    VALUES (${id}, ${lower}, ${userId})
    ON CONFLICT (user_id, name) DO NOTHING
  `
  const rows = await sql`SELECT id FROM tags WHERE name = ${lower} AND user_id = ${userId}`
  return (rows[0]?.id as string) ?? null
}

// ============ FOLDERS ============

export async function getFolders(userId: string): Promise<Folder[]> {
  const rows = await getSQL()`
    SELECT id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
    FROM folders
    WHERE user_id = ${userId}
    ORDER BY name
  `
  return rows as Folder[]
}

export async function createFolder(userId: string, name: string, parentId: string | null): Promise<Folder> {
  const id = generateId()
  const rows = await getSQL()`
    INSERT INTO folders (id, name, parent_id, user_id)
    VALUES (${id}, ${name}, ${parentId}, ${userId})
    RETURNING id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
  `
  return rows[0] as Folder
}

export async function updateFolder(userId: string, id: string, name: string, parentId: string | null): Promise<Folder> {
  const rows = await getSQL()`
    UPDATE folders
    SET name = ${name}, parent_id = ${parentId}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
  `
  return rows[0] as Folder
}

export async function deleteFolder(userId: string, id: string): Promise<void> {
  await getSQL()`DELETE FROM folders WHERE id = ${id} AND user_id = ${userId}`
}

// ============ PROMPTS ============

export async function getPrompts(userId: string): Promise<Prompt[]> {
  const rows = await getSQL()`
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
  `
  return rows as Prompt[]
}

export async function createPrompt(
  userId: string,
  title: string,
  content: string,
  folderId: string,
  tags: string[]
): Promise<Prompt> {
  const sql = getSQL()
  const id = generateId()

  const rows = await sql`
    INSERT INTO prompts (id, title, content, folder_id, user_id)
    VALUES (${id}, ${title}, ${content}, ${folderId}, ${userId})
    RETURNING id, title, content, folder_id as "folderId", created_at as "createdAt", updated_at as "updatedAt"
  `
  const prompt = rows[0] as Prompt
  prompt.tags = []

  for (const tagName of tags) {
    const tagId = await upsertTag(sql, userId, tagName)
    if (tagId) {
      await sql`
        INSERT INTO prompt_tags (prompt_id, tag_id)
        VALUES (${prompt.id}, ${tagId})
        ON CONFLICT DO NOTHING
      `
      prompt.tags.push(tagName.toLowerCase())
    }
  }

  return prompt
}

export async function updatePrompt(
  userId: string,
  id: string,
  title: string,
  content: string,
  folderId: string,
  tags: string[]
): Promise<Prompt> {
  const sql = getSQL()
  const rows = await sql`
    UPDATE prompts
    SET title = ${title}, content = ${content}, folder_id = ${folderId}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, title, content, folder_id as "folderId", created_at as "createdAt", updated_at as "updatedAt"
  `
  const prompt = rows[0] as Prompt
  prompt.tags = []

  await sql`DELETE FROM prompt_tags WHERE prompt_id = ${id}`

  for (const tagName of tags) {
    const tagId = await upsertTag(sql, userId, tagName)
    if (tagId) {
      await sql`
        INSERT INTO prompt_tags (prompt_id, tag_id)
        VALUES (${prompt.id}, ${tagId})
        ON CONFLICT DO NOTHING
      `
      prompt.tags.push(tagName.toLowerCase())
    }
  }

  return prompt
}

export async function deletePrompt(userId: string, id: string): Promise<void> {
  await getSQL()`DELETE FROM prompts WHERE id = ${id} AND user_id = ${userId}`
}

// ============ TAGS ============

export async function getTags(userId: string): Promise<string[]> {
  const rows = await getSQL()`SELECT name FROM tags WHERE user_id = ${userId} ORDER BY name`
  return rows.map(r => r.name as string)
}

export async function createTag(userId: string, name: string): Promise<string> {
  await upsertTag(getSQL(), userId, name)
  return name.toLowerCase()
}

export async function deleteTag(userId: string, name: string): Promise<void> {
  await getSQL()`DELETE FROM tags WHERE name = ${name.toLowerCase()} AND user_id = ${userId}`
}

// ============ TAG CATEGORIES ============

export async function getTagCategories(userId: string): Promise<TagCategory[]> {
  const rows = await getSQL()`
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
  `
  return rows as TagCategory[]
}

export async function createTagCategory(userId: string, name: string, tags: string[]): Promise<TagCategory> {
  const sql = getSQL()
  const id = generateId()
  const rows = await sql`
    INSERT INTO tag_categories (id, name, user_id)
    VALUES (${id}, ${name}, ${userId})
    RETURNING id, name
  `
  const category = rows[0] as TagCategory
  category.tags = []

  for (const tagName of tags) {
    const tagId = await upsertTag(sql, userId, tagName)
    if (tagId) {
      await sql`
        INSERT INTO category_tags (category_id, tag_id)
        VALUES (${category.id}, ${tagId})
        ON CONFLICT DO NOTHING
      `
      category.tags.push(tagName.toLowerCase())
    }
  }

  return category
}

export async function updateTagCategory(userId: string, id: string, name: string, tags: string[]): Promise<TagCategory> {
  const sql = getSQL()
  await sql`
    UPDATE tag_categories SET name = ${name} WHERE id = ${id} AND user_id = ${userId}
  `

  await sql`DELETE FROM category_tags WHERE category_id = ${id}`

  const category: TagCategory = { id, name, tags: [] }

  for (const tagName of tags) {
    const tagId = await upsertTag(sql, userId, tagName)
    if (tagId) {
      await sql`
        INSERT INTO category_tags (category_id, tag_id)
        VALUES (${category.id}, ${tagId})
        ON CONFLICT DO NOTHING
      `
      category.tags.push(tagName.toLowerCase())
    }
  }

  return category
}

export async function deleteTagCategory(userId: string, id: string): Promise<void> {
  await getSQL()`DELETE FROM tag_categories WHERE id = ${id} AND user_id = ${userId}`
}

// ============ BULK OPERATIONS ============

export async function getAllData(userId: string) {
  const [folders, prompts, tags, tagCategories] = await Promise.all([
    getFolders(userId),
    getPrompts(userId),
    getTags(userId),
    getTagCategories(userId)
  ])
  return { folders, prompts, tags, tagCategories }
}

// ============ NOTEBOOKS ============

export async function getNotebooks(userId: string): Promise<Notebook[]> {
  const rows = await getSQL()`
    SELECT id, name, description, icon, icon_color as "iconColor", type, created_at as "createdAt", updated_at as "updatedAt"
    FROM notebooks
    WHERE user_id = ${userId}
    ORDER BY created_at
  `
  return rows as Notebook[]
}

export async function createNotebook(userId: string, name: string, description: string | null = null, icon: string | null = null, iconColor: string | null = null): Promise<Notebook> {
  const id = generateId()
  const rows = await getSQL()`
    INSERT INTO notebooks (id, name, description, icon, icon_color, type, user_id)
    VALUES (${id}, ${name}, ${description}, ${icon}, ${iconColor}, 'notebook', ${userId})
    RETURNING id, name, description, icon, icon_color as "iconColor", type, created_at as "createdAt", updated_at as "updatedAt"
  `
  return rows[0] as Notebook
}

export async function updateNotebook(
  userId: string,
  id: string,
  name: string,
  description: string | null | undefined = undefined,
  icon: string | null | undefined = undefined,
  iconColor: string | null | undefined = undefined
): Promise<Notebook> {
  const sql = getSQL()

  const descValue = description === undefined ? null : description
  const iconValue = icon === undefined ? null : icon
  const iconColorValue = iconColor === undefined ? null : iconColor

  const rows = await sql`
    UPDATE notebooks
    SET name = ${name},
        description = ${descValue},
        icon = ${iconValue},
        icon_color = ${iconColorValue},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, name, description, icon, icon_color as "iconColor", type, created_at as "createdAt", updated_at as "updatedAt"
  `

  return rows[0] as Notebook
}

export async function deleteNotebook(userId: string, id: string): Promise<void> {
  await getSQL()`DELETE FROM notebooks WHERE id = ${id} AND user_id = ${userId}`
}

// ============ NOTES ============

export async function getNotes(userId: string): Promise<Note[]> {
  const rows = await getSQL()`
    SELECT
      n.id,
      n.notebook_id as "notebookId",
      n.title,
      n.content,
      n.type,
      n.template,
      n.position,
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
    ORDER BY n.position ASC, n.created_at DESC
  `
  return rows as Note[]
}

export async function createNote(
  userId: string,
  notebookId: string,
  title: string,
  content: string,
  type: string = 'text',
  template: string | null = null,
  tags: string[] = []
): Promise<Note> {
  const sql = getSQL()
  const id = generateId()
  const maxPos = await sql`
    SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM notes WHERE notebook_id = ${notebookId} AND user_id = ${userId}
  `
  const position = maxPos[0]?.next_pos ?? 0

  const rows = await sql`
    INSERT INTO notes (id, notebook_id, title, content, type, template, position, user_id)
    VALUES (${id}, ${notebookId}, ${title}, ${content}, ${type}, ${template}, ${position}, ${userId})
    RETURNING id, notebook_id as "notebookId", title, content, type, template, position, created_at as "createdAt", updated_at as "updatedAt"
  `
  const note = rows[0] as Note
  note.tags = []

  for (const tagName of tags) {
    const tagId = await upsertTag(sql, userId, tagName)
    if (tagId) {
      await sql`
        INSERT INTO note_tags (note_id, tag_id)
        VALUES (${note.id}, ${tagId})
        ON CONFLICT DO NOTHING
      `
      note.tags.push(tagName.toLowerCase())
    }
  }

  return note
}

export async function updateNote(
  userId: string,
  id: string,
  title: string,
  content: string,
  tags?: string[]
): Promise<Note> {
  const sql = getSQL()
  const rows = await sql`
    UPDATE notes
    SET title = ${title}, content = ${content}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, notebook_id as "notebookId", title, content, type, template, created_at as "createdAt", updated_at as "updatedAt"
  `
  const note = rows[0] as Note
  note.tags = []

  if (tags !== undefined) {
    await sql`DELETE FROM note_tags WHERE note_id = ${id}`

    for (const tagName of tags) {
      const tagId = await upsertTag(sql, userId, tagName)
      if (tagId) {
        await sql`
          INSERT INTO note_tags (note_id, tag_id)
          VALUES (${note.id}, ${tagId})
          ON CONFLICT DO NOTHING
        `
        note.tags.push(tagName.toLowerCase())
      }
    }
  } else {
    const tagRows = await sql`
      SELECT t.name FROM tags t
      JOIN note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = ${id}
    `
    note.tags = tagRows.map(r => r.name as string)
  }

  return note
}

export async function moveNote(userId: string, id: string, newNotebookId: string, position?: number): Promise<Note> {
  const sql = getSQL()
  let targetPosition = position
  if (targetPosition === undefined) {
    const maxPos = await sql`
      SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM notes WHERE notebook_id = ${newNotebookId} AND user_id = ${userId}
    `
    targetPosition = maxPos[0]?.next_pos ?? 0
  }

  const rows = await sql`
    UPDATE notes
    SET notebook_id = ${newNotebookId}, position = ${targetPosition}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, notebook_id as "notebookId", title, content, type, template, position, created_at as "createdAt", updated_at as "updatedAt"
  `
  const note = rows[0] as Note
  const tagRows = await sql`
    SELECT t.name FROM tags t
    JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ${id}
  `
  note.tags = tagRows.map(r => r.name as string)
  return note
}

export async function reorderNotes(userId: string, notebookId: string, noteIds: string[]): Promise<void> {
  const sql = getSQL()
  for (let i = 0; i < noteIds.length; i++) {
    await sql`
      UPDATE notes
      SET position = ${i}, updated_at = NOW()
      WHERE id = ${noteIds[i]} AND notebook_id = ${notebookId} AND user_id = ${userId}
    `
  }
}

export async function duplicateNote(userId: string, id: string, targetNotebookId?: string): Promise<Note> {
  const sql = getSQL()
  const newId = generateId()
  const rows = await sql`
    INSERT INTO notes (id, notebook_id, title, content, type, template, user_id)
    SELECT ${newId}, COALESCE(${targetNotebookId}, notebook_id), title || ' (Copy)', content, type, template, user_id
    FROM notes WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, notebook_id as "notebookId", title, content, type, template, created_at as "createdAt", updated_at as "updatedAt"
  `
  const note = rows[0] as Note
  note.tags = []

  const originalTags = await sql`
    SELECT t.id, t.name FROM tags t
    JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ${id}
  `
  for (const tag of originalTags) {
    await sql`
      INSERT INTO note_tags (note_id, tag_id)
      VALUES (${newId}, ${tag.id})
      ON CONFLICT DO NOTHING
    `
    note.tags.push(tag.name as string)
  }

  return note
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  await getSQL()`DELETE FROM notes WHERE id = ${id} AND user_id = ${userId}`
}

// Convert a prompt to a note with Prompt template
export async function convertPromptToNote(userId: string, promptId: string, notebookId: string): Promise<Note> {
  const sql = getSQL()
  const prompt = await sql`
    SELECT id, title, content, folder_id as "folderId"
    FROM prompts WHERE id = ${promptId} AND user_id = ${userId}
  `
  if (!prompt[0]) {
    throw new Error('Prompt not found')
  }

  const noteId = generateId()
  const rows = await sql`
    INSERT INTO notes (id, notebook_id, title, content, type, template, user_id)
    VALUES (${noteId}, ${notebookId}, ${prompt[0].title}, ${prompt[0].content}, 'prompt', 'prompt', ${userId})
    RETURNING id, notebook_id as "notebookId", title, content, type, template, created_at as "createdAt", updated_at as "updatedAt"
  `
  const note = rows[0] as Note
  note.tags = []

  const promptTags = await sql`
    SELECT t.id, t.name FROM tags t
    JOIN prompt_tags pt ON t.id = pt.tag_id
    WHERE pt.prompt_id = ${promptId}
  `
  for (const tag of promptTags) {
    await sql`
      INSERT INTO note_tags (note_id, tag_id)
      VALUES (${noteId}, ${tag.id})
      ON CONFLICT DO NOTHING
    `
    note.tags.push(tag.name as string)
  }

  return note
}
