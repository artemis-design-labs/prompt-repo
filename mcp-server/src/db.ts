import { neon } from '@neondatabase/serverless';
import type {
  Folder, Prompt, TagCategory, FolderTreeNode, Notebook, Note,
  BookContent, BookSection, Chapter, ChapterVersion, ChapterVersionSummary,
} from './types.js';

// ============ ENV / CONNECTION ============

function getSQL() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL environment variable is not set');
  return neon(databaseUrl);
}

function getCurrentUserId(): string {
  const uid = process.env.MCP_USER_ID;
  if (!uid) {
    throw new Error(
      'MCP_USER_ID environment variable is not set. ' +
      'The MCP server must be launched with MCP_USER_ID so every query is scoped to a single account.'
    );
  }
  return uid;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// ============ TAG INTERNAL HELPERS ============

async function upsertTagAndGetId(name: string, userId: string): Promise<string> {
  const sql = getSQL();
  const lower = name.toLowerCase();
  await sql`
    INSERT INTO tags (id, name, user_id)
    VALUES (${generateId()}, ${lower}, ${userId})
    ON CONFLICT (user_id, name) DO NOTHING
  `;
  const rows = await sql`
    SELECT id FROM tags WHERE name = ${lower} AND user_id = ${userId}
  `;
  return rows[0]!.id as string;
}

// ============ FOLDERS ============

export async function getFolders(): Promise<Folder[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
    FROM folders
    WHERE user_id = ${uid}
    ORDER BY name
  `;
  return rows as Folder[];
}

export async function getFolder(id: string): Promise<Folder | null> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
    FROM folders
    WHERE id = ${id} AND user_id = ${uid}
  `;
  return (rows[0] as Folder) ?? null;
}

export async function getFolderWithPrompts(id: string): Promise<{ folder: Folder; prompts: Prompt[] } | null> {
  const folder = await getFolder(id);
  if (!folder) return null;
  const prompts = await getPromptsByFolder(id);
  return { folder, prompts };
}

export async function createFolder(name: string, parentId: string | null): Promise<Folder> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const id = generateId();
  const rows = await sql`
    INSERT INTO folders (id, name, parent_id, user_id)
    VALUES (${id}, ${name}, ${parentId}, ${uid})
    RETURNING id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  return rows[0] as Folder;
}

export async function updateFolder(id: string, name: string, parentId: string | null): Promise<Folder> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    UPDATE folders
    SET name = ${name}, parent_id = ${parentId}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${uid}
    RETURNING id, name, parent_id as "parentId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows[0]) throw new Error(`Folder ${id} not found or not owned by current user`);
  return rows[0] as Folder;
}

export async function deleteFolder(id: string): Promise<void> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  await sql`DELETE FROM folders WHERE id = ${id} AND user_id = ${uid}`;
}

export async function getFolderTree(): Promise<FolderTreeNode[]> {
  const folders = await getFolders();
  const prompts = await getPrompts();

  const promptCounts: Record<string, number> = {};
  for (const prompt of prompts) {
    promptCounts[prompt.folderId] = (promptCounts[prompt.folderId] || 0) + 1;
  }

  const folderMap = new Map<string, FolderTreeNode>();
  const rootFolders: FolderTreeNode[] = [];

  for (const folder of folders) {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      children: [],
      promptCount: promptCounts[folder.id] || 0,
    });
  }

  for (const folder of folders) {
    const node = folderMap.get(folder.id)!;
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId)!.children.push(node);
    } else {
      rootFolders.push(node);
    }
  }

  return rootFolders;
}

// ============ PROMPTS ============

const PROMPT_SELECT = `
  p.id,
  p.title,
  p.content,
  p.folder_id as "folderId",
  p.created_at as "createdAt",
  p.updated_at as "updatedAt",
  COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
`;

export async function getPrompts(): Promise<Prompt[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT
      p.id, p.title, p.content,
      p.folder_id as "folderId",
      p.created_at as "createdAt", p.updated_at as "updatedAt",
      COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM prompts p
    LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.user_id = ${uid}
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return rows as Prompt[];
}

export async function getPrompt(id: string): Promise<Prompt | null> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT
      p.id, p.title, p.content,
      p.folder_id as "folderId",
      p.created_at as "createdAt", p.updated_at as "updatedAt",
      COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM prompts p
    LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.id = ${id} AND p.user_id = ${uid}
    GROUP BY p.id
  `;
  return (rows[0] as Prompt) ?? null;
}

export async function getPromptsByFolder(folderId: string): Promise<Prompt[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT
      p.id, p.title, p.content,
      p.folder_id as "folderId",
      p.created_at as "createdAt", p.updated_at as "updatedAt",
      COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM prompts p
    LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.folder_id = ${folderId} AND p.user_id = ${uid}
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return rows as Prompt[];
}

export async function getPromptsByTag(tagName: string): Promise<Prompt[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT
      p.id, p.title, p.content,
      p.folder_id as "folderId",
      p.created_at as "createdAt", p.updated_at as "updatedAt",
      COALESCE(array_agg(t2.name) FILTER (WHERE t2.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM prompts p
    INNER JOIN prompt_tags pt ON p.id = pt.prompt_id
    INNER JOIN tags t ON pt.tag_id = t.id AND t.name = ${tagName.toLowerCase()} AND t.user_id = ${uid}
    LEFT JOIN prompt_tags pt2 ON p.id = pt2.prompt_id
    LEFT JOIN tags t2 ON pt2.tag_id = t2.id
    WHERE p.user_id = ${uid}
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return rows as Prompt[];
}

export async function searchPrompts(query: string, folderId?: string): Promise<Prompt[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const searchPattern = `%${query.toLowerCase()}%`;

  if (folderId) {
    const rows = await sql`
      SELECT
        p.id, p.title, p.content,
        p.folder_id as "folderId",
        p.created_at as "createdAt", p.updated_at as "updatedAt",
        COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
      FROM prompts p
      LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.user_id = ${uid}
        AND p.folder_id = ${folderId}
        AND (LOWER(p.title) LIKE ${searchPattern} OR LOWER(p.content) LIKE ${searchPattern})
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    return rows as Prompt[];
  }

  const rows = await sql`
    SELECT
      p.id, p.title, p.content,
      p.folder_id as "folderId",
      p.created_at as "createdAt", p.updated_at as "updatedAt",
      COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM prompts p
    LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.user_id = ${uid}
      AND (LOWER(p.title) LIKE ${searchPattern} OR LOWER(p.content) LIKE ${searchPattern})
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return rows as Prompt[];
}

export async function createPrompt(
  title: string,
  content: string,
  folderId: string,
  tags: string[]
): Promise<Prompt> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const id = generateId();

  const rows = await sql`
    INSERT INTO prompts (id, title, content, folder_id, user_id)
    VALUES (${id}, ${title}, ${content}, ${folderId}, ${uid})
    RETURNING id, title, content, folder_id as "folderId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  const prompt = rows[0] as Prompt;
  prompt.tags = [];

  for (const tagName of tags) {
    const tagId = await upsertTagAndGetId(tagName, uid);
    await sql`
      INSERT INTO prompt_tags (prompt_id, tag_id)
      VALUES (${prompt.id}, ${tagId})
      ON CONFLICT DO NOTHING
    `;
    prompt.tags.push(tagName.toLowerCase());
  }

  return prompt;
}

export async function updatePrompt(
  id: string,
  title: string,
  content: string,
  folderId: string,
  tags: string[]
): Promise<Prompt> {
  const sql = getSQL();
  const uid = getCurrentUserId();

  const rows = await sql`
    UPDATE prompts
    SET title = ${title}, content = ${content}, folder_id = ${folderId}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${uid}
    RETURNING id, title, content, folder_id as "folderId", created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows[0]) throw new Error(`Prompt ${id} not found or not owned by current user`);
  const prompt = rows[0] as Prompt;
  prompt.tags = [];

  // Only remove tag links for prompts the user owns (parent scoping)
  await sql`
    DELETE FROM prompt_tags
    WHERE prompt_id = ${id}
      AND prompt_id IN (SELECT id FROM prompts WHERE user_id = ${uid})
  `;

  for (const tagName of tags) {
    const tagId = await upsertTagAndGetId(tagName, uid);
    await sql`
      INSERT INTO prompt_tags (prompt_id, tag_id)
      VALUES (${prompt.id}, ${tagId})
      ON CONFLICT DO NOTHING
    `;
    prompt.tags.push(tagName.toLowerCase());
  }

  return prompt;
}

export async function deletePrompt(id: string): Promise<void> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  await sql`DELETE FROM prompts WHERE id = ${id} AND user_id = ${uid}`;
}

// ============ TAGS ============

export async function getTags(): Promise<string[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`SELECT name FROM tags WHERE user_id = ${uid} ORDER BY name`;
  return rows.map(r => r.name as string);
}

export async function createTag(name: string): Promise<{ id: string; name: string }> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const lower = name.toLowerCase();
  const id = generateId();
  await sql`
    INSERT INTO tags (id, name, user_id)
    VALUES (${id}, ${lower}, ${uid})
    ON CONFLICT (user_id, name) DO NOTHING
  `;
  const rows = await sql`
    SELECT id, name FROM tags WHERE name = ${lower} AND user_id = ${uid}
  `;
  return rows[0] as { id: string; name: string };
}

export async function updateTag(id: string, newName: string): Promise<{ id: string; name: string }> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const lower = newName.toLowerCase();
  const rows = await sql`
    UPDATE tags
    SET name = ${lower}
    WHERE id = ${id} AND user_id = ${uid}
    RETURNING id, name
  `;
  if (!rows[0]) throw new Error(`Tag ${id} not found or not owned by current user`);
  return rows[0] as { id: string; name: string };
}

export async function deleteTag(id: string): Promise<void> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  // Remove links first (junction rows have no user_id, scope via parent ownership)
  await sql`
    DELETE FROM prompt_tags
    WHERE tag_id = ${id}
      AND tag_id IN (SELECT id FROM tags WHERE user_id = ${uid})
  `;
  await sql`
    DELETE FROM note_tags
    WHERE tag_id = ${id}
      AND tag_id IN (SELECT id FROM tags WHERE user_id = ${uid})
  `;
  await sql`
    DELETE FROM category_tags
    WHERE tag_id = ${id}
      AND tag_id IN (SELECT id FROM tags WHERE user_id = ${uid})
  `;
  await sql`DELETE FROM tags WHERE id = ${id} AND user_id = ${uid}`;
}

// ============ TAG CATEGORIES ============

export async function getTagCategories(): Promise<TagCategory[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT
      tc.id,
      tc.name,
      COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM tag_categories tc
    LEFT JOIN category_tags ct ON tc.id = ct.category_id
    LEFT JOIN tags t ON ct.tag_id = t.id
    WHERE tc.user_id = ${uid}
    GROUP BY tc.id
    ORDER BY tc.name
  `;
  return rows as TagCategory[];
}

export async function createTagCategory(name: string, tagNames: string[] = []): Promise<TagCategory> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const id = generateId();
  await sql`
    INSERT INTO tag_categories (id, name, user_id)
    VALUES (${id}, ${name}, ${uid})
    ON CONFLICT (user_id, name) DO NOTHING
  `;
  const rows = await sql`
    SELECT id, name FROM tag_categories WHERE name = ${name} AND user_id = ${uid}
  `;
  const categoryId = rows[0]!.id as string;
  const tagList: string[] = [];
  for (const tn of tagNames) {
    const tagId = await upsertTagAndGetId(tn, uid);
    await sql`
      INSERT INTO category_tags (category_id, tag_id)
      VALUES (${categoryId}, ${tagId})
      ON CONFLICT DO NOTHING
    `;
    tagList.push(tn.toLowerCase());
  }
  return { id: categoryId, name: rows[0]!.name as string, tags: tagList };
}

export async function updateTagCategory(
  id: string,
  newName: string,
  tagNames?: string[]
): Promise<TagCategory> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    UPDATE tag_categories
    SET name = ${newName}
    WHERE id = ${id} AND user_id = ${uid}
    RETURNING id, name
  `;
  if (!rows[0]) throw new Error(`Tag category ${id} not found or not owned by current user`);

  if (tagNames !== undefined) {
    await sql`
      DELETE FROM category_tags
      WHERE category_id = ${id}
        AND category_id IN (SELECT id FROM tag_categories WHERE user_id = ${uid})
    `;
    for (const tn of tagNames) {
      const tagId = await upsertTagAndGetId(tn, uid);
      await sql`
        INSERT INTO category_tags (category_id, tag_id)
        VALUES (${id}, ${tagId})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  const tagRows = await sql`
    SELECT t.name FROM tags t
    JOIN category_tags ct ON ct.tag_id = t.id
    WHERE ct.category_id = ${id}
  `;
  return {
    id: rows[0].id as string,
    name: rows[0].name as string,
    tags: tagRows.map(r => r.name as string),
  };
}

export async function deleteTagCategory(id: string): Promise<void> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  await sql`
    DELETE FROM category_tags
    WHERE category_id = ${id}
      AND category_id IN (SELECT id FROM tag_categories WHERE user_id = ${uid})
  `;
  await sql`DELETE FROM tag_categories WHERE id = ${id} AND user_id = ${uid}`;
}

// ============ NOTEBOOKS ============

export async function getNotebooks(): Promise<Notebook[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT id, name, type, description, icon, icon_color as "iconColor",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM notebooks
    WHERE user_id = ${uid}
    ORDER BY created_at
  `;
  return rows as Notebook[];
}

export async function getNotebook(id: string): Promise<Notebook | null> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT id, name, type, description, icon, icon_color as "iconColor",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM notebooks
    WHERE id = ${id} AND user_id = ${uid}
  `;
  return (rows[0] as Notebook) ?? null;
}

export async function createNotebook(
  name: string,
  type: string = 'notebook',
  description: string | null = null,
  icon: string | null = null,
  iconColor: string | null = null
): Promise<Notebook> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const id = generateId();
  const rows = await sql`
    INSERT INTO notebooks (id, name, type, description, icon, icon_color, user_id)
    VALUES (${id}, ${name}, ${type}, ${description}, ${icon}, ${iconColor}, ${uid})
    RETURNING id, name, type, description, icon, icon_color as "iconColor",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return rows[0] as Notebook;
}

export async function updateNotebook(
  id: string,
  updates: {
    name?: string;
    description?: string | null;
    icon?: string | null;
    iconColor?: string | null;
    type?: string;
  }
): Promise<Notebook> {
  const sql = getSQL();
  const uid = getCurrentUserId();

  // Fetch current row, merge updates, write back. Simpler than dynamic SQL.
  const current = await getNotebook(id);
  if (!current) throw new Error(`Notebook ${id} not found or not owned by current user`);

  const name = updates.name ?? current.name;
  const type = updates.type ?? current.type;
  const description = updates.description !== undefined ? updates.description : (current.description ?? null);
  const icon = updates.icon !== undefined ? updates.icon : (current.icon ?? null);
  const iconColor = updates.iconColor !== undefined ? updates.iconColor : (current.iconColor ?? null);

  const rows = await sql`
    UPDATE notebooks
    SET name = ${name},
        type = ${type},
        description = ${description},
        icon = ${icon},
        icon_color = ${iconColor},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${uid}
    RETURNING id, name, type, description, icon, icon_color as "iconColor",
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  return rows[0] as Notebook;
}

export async function deleteNotebook(id: string): Promise<void> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  await sql`DELETE FROM notebooks WHERE id = ${id} AND user_id = ${uid}`;
}

// ============ NOTES ============

export async function getNotes(): Promise<Note[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT
      n.id, n.notebook_id as "notebookId", n.title, n.content, n.type, n.template, n.position,
      n.created_at as "createdAt", n.updated_at as "updatedAt",
      COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.user_id = ${uid}
    GROUP BY n.id
    ORDER BY n.created_at DESC
  `;
  return rows as Note[];
}

export async function getNote(id: string): Promise<Note | null> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT
      n.id, n.notebook_id as "notebookId", n.title, n.content, n.type, n.template, n.position,
      n.created_at as "createdAt", n.updated_at as "updatedAt",
      COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.id = ${id} AND n.user_id = ${uid}
    GROUP BY n.id
  `;
  return (rows[0] as Note) ?? null;
}

export async function getNotesByNotebook(notebookId: string): Promise<Note[]> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    SELECT
      n.id, n.notebook_id as "notebookId", n.title, n.content, n.type, n.template, n.position,
      n.created_at as "createdAt", n.updated_at as "updatedAt",
      COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), ARRAY[]::varchar[]) as tags
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.notebook_id = ${notebookId} AND n.user_id = ${uid}
    GROUP BY n.id
    ORDER BY n.position NULLS LAST, n.created_at DESC
  `;
  return rows as Note[];
}

export async function createNote(
  notebookId: string,
  title: string,
  content: string,
  type: string = 'text',
  template: string | null = null,
  tags: string[] = []
): Promise<Note> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  // Defensive: ensure the notebook belongs to this user before parenting the note to it.
  const nb = await getNotebook(notebookId);
  if (!nb) throw new Error(`Notebook ${notebookId} not found or not owned by current user`);

  const id = generateId();
  const rows = await sql`
    INSERT INTO notes (id, notebook_id, title, content, type, template, user_id)
    VALUES (${id}, ${notebookId}, ${title}, ${content}, ${type}, ${template}, ${uid})
    RETURNING id, notebook_id as "notebookId", title, content, type, template, position,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const note = rows[0] as Note;
  note.tags = [];

  for (const tagName of tags) {
    const tagId = await upsertTagAndGetId(tagName, uid);
    await sql`
      INSERT INTO note_tags (note_id, tag_id)
      VALUES (${note.id}, ${tagId})
      ON CONFLICT DO NOTHING
    `;
    note.tags.push(tagName.toLowerCase());
  }

  return note;
}

export async function updateNote(
  id: string,
  title: string,
  content: string,
  tags?: string[]
): Promise<Note> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const rows = await sql`
    UPDATE notes
    SET title = ${title}, content = ${content}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${uid}
    RETURNING id, notebook_id as "notebookId", title, content, type, template, position,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows[0]) throw new Error(`Note ${id} not found or not owned by current user`);
  const note = rows[0] as Note;
  note.tags = [];

  if (tags !== undefined) {
    await sql`
      DELETE FROM note_tags
      WHERE note_id = ${id}
        AND note_id IN (SELECT id FROM notes WHERE user_id = ${uid})
    `;
    for (const tagName of tags) {
      const tagId = await upsertTagAndGetId(tagName, uid);
      await sql`
        INSERT INTO note_tags (note_id, tag_id)
        VALUES (${note.id}, ${tagId})
        ON CONFLICT DO NOTHING
      `;
      note.tags.push(tagName.toLowerCase());
    }
  } else {
    const tagRows = await sql`
      SELECT t.name FROM tags t
      JOIN note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = ${id}
    `;
    note.tags = tagRows.map(r => r.name as string);
  }

  return note;
}

export async function moveNote(id: string, newNotebookId: string): Promise<Note> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const targetNb = await getNotebook(newNotebookId);
  if (!targetNb) throw new Error(`Target notebook ${newNotebookId} not found or not owned by current user`);
  const rows = await sql`
    UPDATE notes
    SET notebook_id = ${newNotebookId}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${uid}
    RETURNING id, notebook_id as "notebookId", title, content, type, template, position,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  if (!rows[0]) throw new Error(`Note ${id} not found or not owned by current user`);
  const note = rows[0] as Note;
  const tagRows = await sql`
    SELECT t.name FROM tags t
    JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ${id}
  `;
  note.tags = tagRows.map(r => r.name as string);
  return note;
}

export async function duplicateNote(id: string, targetNotebookId?: string): Promise<Note> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  if (targetNotebookId) {
    const target = await getNotebook(targetNotebookId);
    if (!target) throw new Error(`Target notebook ${targetNotebookId} not found or not owned by current user`);
  }
  const original = await getNote(id);
  if (!original) throw new Error(`Note ${id} not found or not owned by current user`);

  const newId = generateId();
  const rows = await sql`
    INSERT INTO notes (id, notebook_id, title, content, type, template, user_id)
    SELECT ${newId}, COALESCE(${targetNotebookId || null}, notebook_id), title || ' (Copy)',
           content, type, template, ${uid}
    FROM notes WHERE id = ${id} AND user_id = ${uid}
    RETURNING id, notebook_id as "notebookId", title, content, type, template, position,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const note = rows[0] as Note;
  note.tags = [];

  const originalTags = await sql`
    SELECT t.id, t.name FROM tags t
    JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ${id}
  `;
  for (const tag of originalTags) {
    await sql`
      INSERT INTO note_tags (note_id, tag_id)
      VALUES (${newId}, ${tag.id})
      ON CONFLICT DO NOTHING
    `;
    note.tags.push(tag.name as string);
  }

  return note;
}

export async function convertPromptToNote(promptId: string, notebookId: string): Promise<Note> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  const nb = await getNotebook(notebookId);
  if (!nb) throw new Error(`Notebook ${notebookId} not found or not owned by current user`);
  const prompt = await sql`
    SELECT id, title, content FROM prompts WHERE id = ${promptId} AND user_id = ${uid}
  `;
  if (!prompt[0]) throw new Error('Prompt not found or not owned by current user');

  const noteId = generateId();
  const rows = await sql`
    INSERT INTO notes (id, notebook_id, title, content, type, template, user_id)
    VALUES (${noteId}, ${notebookId}, ${prompt[0].title}, ${prompt[0].content}, 'prompt', 'prompt', ${uid})
    RETURNING id, notebook_id as "notebookId", title, content, type, template, position,
              created_at as "createdAt", updated_at as "updatedAt"
  `;
  const note = rows[0] as Note;
  note.tags = [];

  const promptTags = await sql`
    SELECT t.id, t.name FROM tags t
    JOIN prompt_tags pt ON t.id = pt.tag_id
    WHERE pt.prompt_id = ${promptId}
  `;
  for (const tag of promptTags) {
    await sql`
      INSERT INTO note_tags (note_id, tag_id)
      VALUES (${noteId}, ${tag.id})
      ON CONFLICT DO NOTHING
    `;
    note.tags.push(tag.name as string);
  }

  return note;
}

export async function deleteNote(id: string): Promise<void> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  await sql`DELETE FROM notes WHERE id = ${id} AND user_id = ${uid}`;
}

// ============ CHAPTER VERSIONS (operates on JSON content of book notes) ============

async function loadBookContent(noteId: string): Promise<{ note: Note; book: BookContent }> {
  const note = await getNote(noteId);
  if (!note) throw new Error(`Note ${noteId} not found or not owned by current user`);
  let book: BookContent;
  try {
    book = JSON.parse(note.content);
  } catch (e) {
    throw new Error(`Note ${noteId} content is not valid JSON (type=${note.type}); cannot operate on chapters`);
  }
  if (!book || !Array.isArray(book.sections)) {
    throw new Error(`Note ${noteId} content has no sections[]; not a book-style note`);
  }
  return { note, book };
}

async function saveBookContent(noteId: string, book: BookContent): Promise<void> {
  const sql = getSQL();
  const uid = getCurrentUserId();
  await sql`
    UPDATE notes
    SET content = ${JSON.stringify(book)}, updated_at = NOW()
    WHERE id = ${noteId} AND user_id = ${uid}
  `;
}

function findChapter(book: BookContent, chapterId: string): { section: BookSection; chapter: Chapter } {
  for (const section of book.sections) {
    const chapter = section.chapters.find(c => c.id === chapterId);
    if (chapter) return { section, chapter };
  }
  throw new Error(`Chapter ${chapterId} not found in book`);
}

export async function listChapterVersions(noteId: string, chapterId: string): Promise<ChapterVersionSummary[]> {
  const { book } = await loadBookContent(noteId);
  const { chapter } = findChapter(book, chapterId);
  const versions = chapter.versions || [];
  return versions
    .map(v => ({
      id: v.id,
      name: v.name,
      savedAt: v.savedAt,
      contentLength: (v.content || '').length,
    }))
    .sort((a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
}

export async function getChapterVersion(
  noteId: string,
  chapterId: string,
  versionId: string
): Promise<ChapterVersion> {
  const { book } = await loadBookContent(noteId);
  const { chapter } = findChapter(book, chapterId);
  const version = (chapter.versions || []).find(v => v.id === versionId);
  if (!version) throw new Error(`Version ${versionId} not found in chapter ${chapterId}`);
  return version;
}

export async function createChapterVersion(
  noteId: string,
  chapterId: string,
  name: string,
  content?: string
): Promise<ChapterVersion> {
  const { book } = await loadBookContent(noteId);
  const { chapter } = findChapter(book, chapterId);
  const newVersion: ChapterVersion = {
    id: generateId(),
    name,
    content: content !== undefined ? content : (chapter.content || ''),
    savedAt: new Date().toISOString(),
  };
  if (!chapter.versions) chapter.versions = [];
  chapter.versions.push(newVersion);
  await saveBookContent(noteId, book);
  return newVersion;
}

export async function restoreChapterVersion(
  noteId: string,
  chapterId: string,
  versionId: string
): Promise<{ chapterId: string; newContent: string }> {
  const { book } = await loadBookContent(noteId);
  const { chapter } = findChapter(book, chapterId);
  const version = (chapter.versions || []).find(v => v.id === versionId);
  if (!version) throw new Error(`Version ${versionId} not found in chapter ${chapterId}`);
  chapter.content = version.content;
  await saveBookContent(noteId, book);
  return { chapterId, newContent: version.content };
}

export async function deleteChapterVersion(
  noteId: string,
  chapterId: string,
  versionId: string
): Promise<void> {
  const { book } = await loadBookContent(noteId);
  const { chapter } = findChapter(book, chapterId);
  if (!chapter.versions) chapter.versions = [];
  const before = chapter.versions.length;
  chapter.versions = chapter.versions.filter(v => v.id !== versionId);
  if (chapter.versions.length === before) {
    throw new Error(`Version ${versionId} not found in chapter ${chapterId}`);
  }
  await saveBookContent(noteId, book);
}
