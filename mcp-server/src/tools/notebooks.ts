import * as db from '../db.js';
import type { SpreadsheetData } from '../types.js';

// Tool definitions for notebooks and notes
export const notebookTools = [
  {
    name: 'list_notebooks',
    description: 'List all notebooks in the system',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_notebook',
    description: 'Get a notebook by ID with its notes',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The notebook ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_notebook',
    description: 'Create a new notebook',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'The notebook name',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_notebook',
    description: 'Update notebook fields. Any omitted field is left unchanged.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'The notebook ID' },
        name: { type: 'string', description: 'New name (optional)' },
        description: { type: 'string', description: 'New description (optional, pass empty string to clear)' },
        icon: { type: 'string', description: 'New icon name/identifier (optional, pass empty string to clear)' },
        icon_color: { type: 'string', description: 'New icon color (optional, pass empty string to clear)' },
        type: {
          type: 'string',
          description: 'Notebook type (rarely changed). Allowed: prompts | notebook | book',
          enum: ['prompts', 'notebook', 'book'],
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_notebook',
    description: 'Delete a notebook and all its notes (cannot delete the Prompts notebook)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The notebook ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_notes',
    description: 'List all notes, optionally filtered by notebook',
    inputSchema: {
      type: 'object' as const,
      properties: {
        notebook_id: {
          type: 'string',
          description: 'Filter notes by notebook ID',
        },
      },
    },
  },
  {
    name: 'get_note',
    description: 'Get a single note by ID with its full content',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The note ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_text_note',
    description: 'Create a new text note in a notebook',
    inputSchema: {
      type: 'object' as const,
      properties: {
        notebook_id: {
          type: 'string',
          description: 'The notebook ID to create the note in',
        },
        title: {
          type: 'string',
          description: 'The note title',
        },
        content: {
          type: 'string',
          description: 'The note content/text',
        },
      },
      required: ['notebook_id', 'title'],
    },
  },
  {
    name: 'create_spreadsheet_note',
    description: 'Create a new spreadsheet note in a notebook with columns and rows of data',
    inputSchema: {
      type: 'object' as const,
      properties: {
        notebook_id: {
          type: 'string',
          description: 'The notebook ID to create the note in',
        },
        title: {
          type: 'string',
          description: 'The note title',
        },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of column headers (e.g., ["Name", "Quantity", "Price"])',
        },
        rows: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
          description: 'Array of rows, where each row is an array of cell values (e.g., [["Apple", "5", "$2.00"], ["Banana", "3", "$1.50"]])',
        },
      },
      required: ['notebook_id', 'title', 'columns', 'rows'],
    },
  },
  {
    name: 'create_prompt_note',
    description: 'Create a new prompt note (AI prompt template) in a notebook with optional tags',
    inputSchema: {
      type: 'object' as const,
      properties: {
        notebook_id: {
          type: 'string',
          description: 'The notebook ID to create the note in',
        },
        title: {
          type: 'string',
          description: 'The prompt title',
        },
        content: {
          type: 'string',
          description: 'The prompt content/instructions',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags to categorize the prompt (e.g., ["coding", "debug", "python"])',
        },
      },
      required: ['notebook_id', 'title', 'content'],
    },
  },
  {
    name: 'update_note',
    description: 'Update an existing note (text, spreadsheet, or prompt)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The note ID to update',
        },
        title: {
          type: 'string',
          description: 'New title (optional)',
        },
        content: {
          type: 'string',
          description: 'New content for text/prompt notes (optional)',
        },
        columns: {
          type: 'array',
          items: { type: 'string' },
          description: 'New columns for spreadsheet notes (optional)',
        },
        rows: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
          description: 'New rows for spreadsheet notes (optional)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New tags for prompt notes (optional, replaces existing tags)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a note by ID',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The note ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_spreadsheet_rows',
    description: 'Add rows to an existing spreadsheet note',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The spreadsheet note ID',
        },
        rows: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
          description: 'Rows to add (each row should match the number of columns)',
        },
      },
      required: ['id', 'rows'],
    },
  },
  {
    name: 'move_note',
    description: 'Move a note to a different notebook',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The note ID to move',
        },
        notebook_id: {
          type: 'string',
          description: 'The target notebook ID',
        },
      },
      required: ['id', 'notebook_id'],
    },
  },
  {
    name: 'duplicate_note',
    description: 'Duplicate a note, optionally to a different notebook',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'The note ID to duplicate',
        },
        notebook_id: {
          type: 'string',
          description: 'Target notebook ID (optional, defaults to same notebook)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'convert_prompt_to_note',
    description: 'Convert an existing prompt into a note with "prompt" template',
    inputSchema: {
      type: 'object' as const,
      properties: {
        prompt_id: {
          type: 'string',
          description: 'The prompt ID to convert',
        },
        notebook_id: {
          type: 'string',
          description: 'The target notebook ID for the new note',
        },
      },
      required: ['prompt_id', 'notebook_id'],
    },
  },
  {
    name: 'list_chapter_versions',
    description: 'List saved versions of a chapter inside a book-type note. Returns metadata only (id, name, savedAt, contentLength) sorted oldest-first.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'The book note ID' },
        chapter_id: { type: 'string', description: 'The chapter ID inside the book (e.g. "ch1")' },
      },
      required: ['note_id', 'chapter_id'],
    },
  },
  {
    name: 'get_chapter_version',
    description: 'Fetch the full content of one saved chapter version.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'The book note ID' },
        chapter_id: { type: 'string', description: 'The chapter ID' },
        version_id: { type: 'string', description: 'The version ID' },
      },
      required: ['note_id', 'chapter_id', 'version_id'],
    },
  },
  {
    name: 'create_chapter_version',
    description: 'Save a new version of a chapter. If content is omitted, snapshots the chapter\'s current content. Returns the new version metadata.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'The book note ID' },
        chapter_id: { type: 'string', description: 'The chapter ID' },
        name: { type: 'string', description: 'A label for this version (e.g. "Pre-edit draft")' },
        content: {
          type: 'string',
          description: 'Optional: explicit content to store. Defaults to the chapter\'s current content.',
        },
      },
      required: ['note_id', 'chapter_id', 'name'],
    },
  },
  {
    name: 'restore_chapter_version',
    description: 'Overwrite a chapter\'s current content with the content of one of its saved versions. The version itself is preserved in history.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'The book note ID' },
        chapter_id: { type: 'string', description: 'The chapter ID' },
        version_id: { type: 'string', description: 'The version ID to restore from' },
      },
      required: ['note_id', 'chapter_id', 'version_id'],
    },
  },
  {
    name: 'delete_chapter_version',
    description: 'Delete a saved chapter version permanently.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        note_id: { type: 'string', description: 'The book note ID' },
        chapter_id: { type: 'string', description: 'The chapter ID' },
        version_id: { type: 'string', description: 'The version ID to delete' },
      },
      required: ['note_id', 'chapter_id', 'version_id'],
    },
  },
];

// Helper to parse spreadsheet content
function parseSpreadsheetContent(content: string): SpreadsheetData {
  try {
    return JSON.parse(content);
  } catch {
    return { columns: ['Column A', 'Column B', 'Column C'], rows: [['', '', '']] };
  }
}

// Tool handlers
export async function handleNotebookTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case 'list_notebooks': {
      const notebooks = await db.getNotebooks();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              notebooks.map(n => ({
                id: n.id,
                name: n.name,
                type: n.type,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_notebook': {
      const notebook = await db.getNotebook(args.id as string);
      if (!notebook) {
        return {
          content: [{ type: 'text', text: `Notebook not found: ${args.id}` }],
        };
      }
      const notes = await db.getNotesByNotebook(args.id as string);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...notebook,
                notes: notes.map(n => ({
                  id: n.id,
                  title: n.title,
                  type: n.type,
                  contentPreview: n.type === 'spreadsheet'
                    ? `Spreadsheet with ${parseSpreadsheetContent(n.content).rows.length} rows`
                    : n.content.substring(0, 100) + (n.content.length > 100 ? '...' : ''),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'create_notebook': {
      const notebook = await db.createNotebook(args.name as string, 'notebook');
      return {
        content: [
          {
            type: 'text',
            text: `Created notebook "${notebook.name}" with ID: ${notebook.id}\n\n${JSON.stringify(notebook, null, 2)}`,
          },
        ],
      };
    }

    case 'update_notebook': {
      const updates: Parameters<typeof db.updateNotebook>[1] = {};
      if (args.name !== undefined) updates.name = args.name as string;
      if (args.type !== undefined) updates.type = args.type as string;
      // Empty string clears these nullable fields; non-empty sets; undefined leaves alone.
      if (args.description !== undefined) {
        updates.description = (args.description as string) === '' ? null : (args.description as string);
      }
      if (args.icon !== undefined) {
        updates.icon = (args.icon as string) === '' ? null : (args.icon as string);
      }
      if (args.icon_color !== undefined) {
        updates.iconColor = (args.icon_color as string) === '' ? null : (args.icon_color as string);
      }
      const notebook = await db.updateNotebook(args.id as string, updates);
      return {
        content: [
          {
            type: 'text',
            text: `Updated notebook "${notebook.name}" (ID: ${notebook.id})\n\n${JSON.stringify(notebook, null, 2)}`,
          },
        ],
      };
    }

    case 'delete_notebook': {
      if (args.id === 'note1') {
        return {
          content: [{ type: 'text', text: 'Cannot delete the Prompts notebook' }],
        };
      }
      const notebook = await db.getNotebook(args.id as string);
      if (!notebook) {
        return {
          content: [{ type: 'text', text: `Notebook not found: ${args.id}` }],
        };
      }
      await db.deleteNotebook(args.id as string);
      return {
        content: [
          {
            type: 'text',
            text: `Deleted notebook "${notebook.name}" (ID: ${args.id})`,
          },
        ],
      };
    }

    case 'list_notes': {
      let notes;
      if (args.notebook_id) {
        notes = await db.getNotesByNotebook(args.notebook_id as string);
      } else {
        notes = await db.getNotes();
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              notes.map(n => ({
                id: n.id,
                title: n.title,
                notebookId: n.notebookId,
                type: n.type,
                template: n.template,
                tags: n.tags || [],
                contentPreview: n.type === 'spreadsheet'
                  ? `Spreadsheet with ${parseSpreadsheetContent(n.content).rows.length} rows`
                  : n.content.substring(0, 100) + (n.content.length > 100 ? '...' : ''),
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case 'get_note': {
      const note = await db.getNote(args.id as string);
      if (!note) {
        return {
          content: [{ type: 'text', text: `Note not found: ${args.id}` }],
        };
      }

      // For spreadsheet notes, parse and format the content nicely
      if (note.type === 'spreadsheet') {
        const spreadsheetData = parseSpreadsheetContent(note.content);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...note,
                  spreadsheetData,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
      };
    }

    case 'create_text_note': {
      const note = await db.createNote(
        args.notebook_id as string,
        args.title as string,
        (args.content as string) || '',
        'text'
      );
      return {
        content: [
          {
            type: 'text',
            text: `Created text note "${note.title}" with ID: ${note.id}\n\n${JSON.stringify(note, null, 2)}`,
          },
        ],
      };
    }

    case 'create_spreadsheet_note': {
      const columns = args.columns as string[];
      const rows = args.rows as string[][];

      // Ensure each row has the same number of cells as columns
      const normalizedRows = rows.map(row => {
        const newRow = [...row];
        while (newRow.length < columns.length) newRow.push('');
        return newRow.slice(0, columns.length);
      });

      const spreadsheetContent: SpreadsheetData = {
        columns,
        rows: normalizedRows,
      };

      const note = await db.createNote(
        args.notebook_id as string,
        args.title as string,
        JSON.stringify(spreadsheetContent),
        'spreadsheet'
      );

      return {
        content: [
          {
            type: 'text',
            text: `Created spreadsheet note "${note.title}" with ID: ${note.id}\n` +
              `Columns: ${columns.join(', ')}\n` +
              `Rows: ${normalizedRows.length}\n\n` +
              JSON.stringify({ ...note, spreadsheetData: spreadsheetContent }, null, 2),
          },
        ],
      };
    }

    case 'create_prompt_note': {
      const tags = (args.tags as string[]) || [];
      const note = await db.createNote(
        args.notebook_id as string,
        args.title as string,
        (args.content as string) || '',
        'prompt',
        'prompt',
        tags
      );
      return {
        content: [
          {
            type: 'text',
            text: `Created prompt note "${note.title}" with ID: ${note.id}\n` +
              `Tags: ${note.tags?.join(', ') || 'none'}\n\n` +
              JSON.stringify(note, null, 2),
          },
        ],
      };
    }

    case 'update_note': {
      const existing = await db.getNote(args.id as string);
      if (!existing) {
        return {
          content: [{ type: 'text', text: `Note not found: ${args.id}` }],
        };
      }

      let newContent = existing.content;

      // Handle spreadsheet updates
      if (existing.type === 'spreadsheet' && (args.columns || args.rows)) {
        const currentData = parseSpreadsheetContent(existing.content);
        const newColumns = (args.columns as string[]) || currentData.columns;
        const newRows = (args.rows as string[][]) || currentData.rows;

        // Normalize rows to match column count
        const normalizedRows = newRows.map(row => {
          const newRow = [...row];
          while (newRow.length < newColumns.length) newRow.push('');
          return newRow.slice(0, newColumns.length);
        });

        newContent = JSON.stringify({ columns: newColumns, rows: normalizedRows });
      } else if (args.content !== undefined) {
        newContent = args.content as string;
      }

      // Get tags if provided
      const tags = args.tags as string[] | undefined;

      const note = await db.updateNote(
        args.id as string,
        (args.title as string) || existing.title,
        newContent,
        tags
      );

      return {
        content: [
          {
            type: 'text',
            text: `Updated note "${note.title}"\n` +
              (note.tags?.length ? `Tags: ${note.tags.join(', ')}\n` : '') +
              `\n${JSON.stringify(
                note.type === 'spreadsheet'
                  ? { ...note, spreadsheetData: parseSpreadsheetContent(note.content) }
                  : note,
                null,
                2
              )}`,
          },
        ],
      };
    }

    case 'delete_note': {
      const existing = await db.getNote(args.id as string);
      if (!existing) {
        return {
          content: [{ type: 'text', text: `Note not found: ${args.id}` }],
        };
      }
      await db.deleteNote(args.id as string);
      return {
        content: [
          {
            type: 'text',
            text: `Deleted note "${existing.title}" (ID: ${args.id})`,
          },
        ],
      };
    }

    case 'add_spreadsheet_rows': {
      const existing = await db.getNote(args.id as string);
      if (!existing) {
        return {
          content: [{ type: 'text', text: `Note not found: ${args.id}` }],
        };
      }
      if (existing.type !== 'spreadsheet') {
        return {
          content: [{ type: 'text', text: `Note "${existing.title}" is not a spreadsheet note` }],
        };
      }

      const currentData = parseSpreadsheetContent(existing.content);
      const newRows = args.rows as string[][];

      // Normalize new rows to match column count
      const normalizedNewRows = newRows.map(row => {
        const newRow = [...row];
        while (newRow.length < currentData.columns.length) newRow.push('');
        return newRow.slice(0, currentData.columns.length);
      });

      const updatedData: SpreadsheetData = {
        columns: currentData.columns,
        rows: [...currentData.rows, ...normalizedNewRows],
      };

      const note = await db.updateNote(
        args.id as string,
        existing.title,
        JSON.stringify(updatedData)
      );

      return {
        content: [
          {
            type: 'text',
            text: `Added ${normalizedNewRows.length} rows to spreadsheet "${note.title}"\n` +
              `Total rows: ${updatedData.rows.length}\n\n` +
              JSON.stringify({ ...note, spreadsheetData: updatedData }, null, 2),
          },
        ],
      };
    }

    case 'move_note': {
      const existing = await db.getNote(args.id as string);
      if (!existing) {
        return {
          content: [{ type: 'text', text: `Note not found: ${args.id}` }],
        };
      }

      const targetNotebook = await db.getNotebook(args.notebook_id as string);
      if (!targetNotebook) {
        return {
          content: [{ type: 'text', text: `Notebook not found: ${args.notebook_id}` }],
        };
      }

      const movedNote = await db.moveNote(args.id as string, args.notebook_id as string);
      return {
        content: [
          {
            type: 'text',
            text: `Moved note "${movedNote.title}" to notebook "${targetNotebook.name}"\n\n${JSON.stringify(movedNote, null, 2)}`,
          },
        ],
      };
    }

    case 'duplicate_note': {
      const existing = await db.getNote(args.id as string);
      if (!existing) {
        return {
          content: [{ type: 'text', text: `Note not found: ${args.id}` }],
        };
      }

      const duplicatedNote = await db.duplicateNote(
        args.id as string,
        args.notebook_id as string | undefined
      );
      return {
        content: [
          {
            type: 'text',
            text: `Duplicated note "${existing.title}" as "${duplicatedNote.title}"\n\n${JSON.stringify(duplicatedNote, null, 2)}`,
          },
        ],
      };
    }

    case 'convert_prompt_to_note': {
      const targetNotebook = await db.getNotebook(args.notebook_id as string);
      if (!targetNotebook) {
        return {
          content: [{ type: 'text', text: `Notebook not found: ${args.notebook_id}` }],
        };
      }

      try {
        const newNote = await db.convertPromptToNote(
          args.prompt_id as string,
          args.notebook_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Converted prompt to note "${newNote.title}" in notebook "${targetNotebook.name}"\n` +
                `Template: prompt\n\n${JSON.stringify(newNote, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Failed to convert prompt: ${error}` }],
        };
      }
    }

    case 'list_chapter_versions': {
      const versions = await db.listChapterVersions(
        args.note_id as string,
        args.chapter_id as string
      );
      return {
        content: [
          {
            type: 'text',
            text: versions.length
              ? `${versions.length} version(s) for chapter ${args.chapter_id}:\n\n${JSON.stringify(versions, null, 2)}`
              : `No saved versions for chapter ${args.chapter_id}.`,
          },
        ],
      };
    }

    case 'get_chapter_version': {
      const version = await db.getChapterVersion(
        args.note_id as string,
        args.chapter_id as string,
        args.version_id as string
      );
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(version, null, 2),
          },
        ],
      };
    }

    case 'create_chapter_version': {
      const version = await db.createChapterVersion(
        args.note_id as string,
        args.chapter_id as string,
        args.name as string,
        args.content as string | undefined
      );
      return {
        content: [
          {
            type: 'text',
            text: `Saved version "${version.name}" (ID: ${version.id}, ${version.content.length} chars) for chapter ${args.chapter_id}`,
          },
        ],
      };
    }

    case 'restore_chapter_version': {
      const result = await db.restoreChapterVersion(
        args.note_id as string,
        args.chapter_id as string,
        args.version_id as string
      );
      return {
        content: [
          {
            type: 'text',
            text: `Restored chapter ${result.chapterId} from version ${args.version_id} (${result.newContent.length} chars)`,
          },
        ],
      };
    }

    case 'delete_chapter_version': {
      await db.deleteChapterVersion(
        args.note_id as string,
        args.chapter_id as string,
        args.version_id as string
      );
      return {
        content: [
          {
            type: 'text',
            text: `Deleted version ${args.version_id} from chapter ${args.chapter_id}`,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown notebook tool: ${name}`);
  }
}
