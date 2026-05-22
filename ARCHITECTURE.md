# Software Architecture

A comprehensive architecture document for Enterprise AI applications built with Next.js, React, and PostgreSQL.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Database Architecture](#database-architecture)
5. [API Architecture](#api-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [AI Integration](#ai-integration)
8. [Data Flow](#data-flow)
9. [State Management](#state-management)
10. [Security Considerations](#security-considerations)
11. [Deployment Architecture](#deployment-architecture)
12. [Extension Patterns](#extension-patterns)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Components                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │    │
│  │  │ Notebooks │  │  Notes   │  │ Editors  │  │ AI Chat │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS SERVER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     API Routes                           │    │
│  │  /api/data    /api/notebooks    /api/notes    /api/chat │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Database Layer                         │    │
│  │              src/lib/db/index.ts                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │ SQL (TCP/TLS)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEON SERVERLESS POSTGRES                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ notebooks │  │  notes   │  │ prompts  │  │  tags    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Anthropic Claude API (AI Chat)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 15 (App Router) | Full-stack React framework with SSR/SSG |
| **Frontend** | React 19 | UI component library |
| **Styling** | Tailwind CSS 4 | Utility-first CSS framework |
| **Database** | Neon Serverless PostgreSQL | Managed PostgreSQL with serverless scaling |
| **Database SDK** | @neondatabase/serverless | HTTP-based Postgres client |
| **AI** | Anthropic Claude API | LLM for chat/analysis features |
| **Icons** | Lucide React | Icon library |
| **Spreadsheet** | XLSX | Excel/CSV parsing and export |
| **Hosting** | Vercel | Serverless deployment platform |
| **Testing** | Vitest | Unit and integration testing |

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (REST endpoints)
│   │   ├── chat/                 # AI Chat endpoint
│   │   │   └── route.ts          # POST - Claude streaming
│   │   ├── data/                 # Aggregate data endpoint
│   │   │   └── route.ts          # GET - All app data
│   │   ├── folders/              # Folder CRUD
│   │   │   ├── route.ts          # GET/POST
│   │   │   └── [id]/route.ts     # PUT/DELETE
│   │   ├── notebooks/            # Notebook CRUD
│   │   │   ├── route.ts          # GET/POST
│   │   │   └── [id]/route.ts     # PUT/DELETE
│   │   ├── notes/                # Note CRUD
│   │   │   ├── route.ts          # GET/POST
│   │   │   └── [id]/route.ts     # PUT/DELETE
│   │   ├── prompts/              # Prompt CRUD
│   │   │   ├── route.ts          # GET/POST
│   │   │   └── [id]/
│   │   │       ├── route.ts      # PUT/DELETE
│   │   │       └── convert-to-note/route.ts
│   │   ├── tags/                 # Tag management
│   │   │   └── route.ts          # GET/POST/DELETE
│   │   ├── tag-categories/       # Tag category CRUD
│   │   │   ├── route.ts          # GET/POST
│   │   │   └── [id]/route.ts     # PUT/DELETE
│   │   ├── migrate-prompts/      # Migration utilities
│   │   │   └── route.ts          # GET (preview) / POST (execute)
│   │   └── migrate-ia/           # IA migration
│   │       └── route.ts
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/
│   └── PromptRepository.jsx      # Main application component
├── lib/
│   └── db/
│       └── index.ts              # Database utility functions
├── types/
│   └── index.ts                  # TypeScript type definitions
├── data/
│   └── defaultFolders.js         # Default seed data
└── __tests__/                    # Test files
    └── example.test.ts
```

---

## Database Architecture

### Entity Relationship Diagram

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   notebooks   │       │     notes     │       │    prompts    │
├───────────────┤       ├───────────────┤       ├───────────────┤
│ id (PK)       │◄──────│ notebook_id   │       │ id (PK)       │
│ name          │       │ id (PK)       │       │ title         │
│ description   │       │ title         │       │ content       │
│ icon          │       │ content       │       │ folder_id (FK)│──┐
│ icon_color    │       │ type          │       │ created_at    │  │
│ type          │       │ template      │       │ updated_at    │  │
│ created_at    │       │ position      │       └───────────────┘  │
│ updated_at    │       │ created_at    │                          │
└───────────────┘       │ updated_at    │       ┌───────────────┐  │
                        └───────────────┘       │    folders    │  │
                               │                ├───────────────┤  │
                               │                │ id (PK)       │◄─┘
                               ▼                │ name          │
                        ┌───────────────┐       │ parent_id (FK)│──┐
                        │   note_tags   │       │ created_at    │  │
                        ├───────────────┤       │ updated_at    │  │
                        │ note_id (FK)  │       └───────────────┘◄─┘
                        │ tag_id (FK)   │              │
                        └───────────────┘              │
                               │                       │
                               ▼                       ▼
                        ┌───────────────┐       ┌───────────────┐
                        │     tags      │       │ prompt_tags   │
                        ├───────────────┤       ├───────────────┤
                        │ id (PK)       │◄──────│ tag_id (FK)   │
                        │ name (UNIQUE) │       │ prompt_id (FK)│
                        └───────────────┘       └───────────────┘
                               │
                               ▼
                        ┌───────────────┐
                        │ category_tags │
                        ├───────────────┤
                        │ category_id   │──────►┌───────────────┐
                        │ tag_id (FK)   │       │tag_categories │
                        └───────────────┘       ├───────────────┤
                                                │ id (PK)       │
                                                │ name          │
                                                └───────────────┘
```

### Schema Definition

```sql
-- Notebooks (containers for notes)
CREATE TABLE notebooks (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  icon_color VARCHAR(20),
  type VARCHAR(50) DEFAULT 'notebook',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notes (content within notebooks)
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  notebook_id TEXT REFERENCES notebooks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'text',
  template VARCHAR(50),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Folders (hierarchical organization for prompts)
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prompts (AI prompt storage)
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tags (reusable labels)
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- Tag Categories (grouping for tags)
CREATE TABLE tag_categories (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- Junction Tables
CREATE TABLE note_tags (
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE prompt_tags (
  prompt_id TEXT REFERENCES prompts(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (prompt_id, tag_id)
);

CREATE TABLE category_tags (
  category_id TEXT REFERENCES tag_categories(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, tag_id)
);

-- Indexes
CREATE INDEX idx_notes_notebook_id ON notes(notebook_id);
CREATE INDEX idx_notes_position ON notes(position);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_prompts_folder_id ON prompts(folder_id);
CREATE INDEX idx_tags_name ON tags(name);
```

### Note Types and Content Formats

| Type | Template | Content Format |
|------|----------|----------------|
| `text` | `null` | Plain text or markdown |
| `spreadsheet` | `null` or template name | JSON: `{ tables: [...], activeTableIndex: number }` |
| `prompt` | `prompt` | Plain text (AI prompt) |
| `book` | `book` | JSON: `{ sections: [...], autoNumber: boolean }` |
| `tiktok` | `tiktok` | JSON: `{ scripts: [...] }` |
| `travel` | `travel` | JSON: `{ trip: {...}, travelers: [...], days: [...] }` |

---

## API Architecture

### RESTful Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/data` | Fetch all app data (notebooks, notes, prompts, tags) |
| `GET` | `/api/notebooks` | List all notebooks |
| `POST` | `/api/notebooks` | Create notebook |
| `PUT` | `/api/notebooks/[id]` | Update notebook |
| `DELETE` | `/api/notebooks/[id]` | Delete notebook |
| `GET` | `/api/notes` | List all notes |
| `POST` | `/api/notes` | Create note |
| `PUT` | `/api/notes/[id]` | Update note |
| `DELETE` | `/api/notes/[id]` | Delete note |
| `POST` | `/api/notes/[id]/move` | Move note to different notebook |
| `POST` | `/api/chat` | AI chat with streaming response |

### API Route Pattern

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getItems, createItem } from '@/lib/db'

export async function GET() {
  try {
    const items = await getItems()
    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const item = await createItem(body)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    )
  }
}
```

### Database Utility Pattern

```typescript
// src/lib/db/index.ts
import { neon } from '@neondatabase/serverless'

// Lazy initialization (required for serverless)
function getSQL() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set')
  }
  return neon(databaseUrl)
}

// Generate random IDs
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// Example CRUD function
export async function createNote(
  notebookId: string,
  title: string,
  content: string,
  type: string = 'text',
  template: string | null = null,
  tags: string[] = []
): Promise<Note> {
  const id = generateId()
  const rows = await getSQL()`
    INSERT INTO notes (id, notebook_id, title, content, type, template)
    VALUES (${id}, ${notebookId}, ${title}, ${content}, ${type}, ${template})
    RETURNING *
  `
  return rows[0] as Note
}
```

---

## Frontend Architecture

### Component Hierarchy

```
PromptRepository (Main Component)
├── Sidebar
│   ├── NotebookList
│   │   └── NotebookItem (with icon, color)
│   └── NotesList
│       └── NoteItem (with drag-drop, actions)
├── MainContent
│   ├── NoteHeader (title, actions, AI chat button)
│   └── NoteEditor
│       ├── TextEditor
│       ├── SpreadsheetEditor
│       │   └── TableComponent (multi-table)
│       ├── BookEditor
│       │   └── ChapterList (with versions)
│       ├── TravelEditor
│       │   └── DayCards
│       └── PromptEditor
├── Modals
│   ├── CreateNoteModal
│   ├── MoveNoteModal
│   ├── EditNotebookModal
│   └── TagManagerModal
└── ChatDrawer (AI Chat)
    ├── MessageList
    └── InputArea
```

### State Management Pattern

```javascript
// React useState for local component state
const [notebooks, setNotebooks] = useState([]);
const [notes, setNotes] = useState([]);
const [activeNotebook, setActiveNotebook] = useState(null);
const [activeNote, setActiveNote] = useState(null);

// API helper object pattern
const api = {
  async getData() {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  },
  async createNote(notebookId, title, content, type, template, tags) {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebookId, title, content, type, template, tags })
    });
    if (!res.ok) throw new Error('Failed to create');
    return res.json();
  }
  // ... more methods
};

// Handler pattern with optimistic updates
const createNote = async (noteData) => {
  try {
    const newNote = await api.createNote(...noteData);
    setNotes(prev => [...prev, newNote]);
    showNotification('Note created');
  } catch (error) {
    console.error('Error:', error);
    showNotification('Failed to create note');
  }
};
```

---

## AI Integration

### Chat Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chat Drawer   │────►│   /api/chat     │────►│  Anthropic API  │
│   (Frontend)    │◄────│   (Backend)     │◄────│  (Claude)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │ User sends message    │ Build context
        │ Display streaming     │ Stream response
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  chatMessages   │     │  Note Content   │
│  (React State)  │     │  (System Prompt)│
└─────────────────┘     └─────────────────┘
```

### Streaming Response Pattern

```typescript
// src/app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  const { messages, noteContent, noteTitle, noteType } = await request.json()

  const systemPrompt = `You are analyzing this note:
Title: ${noteTitle}
Type: ${noteType}
Content: ${formatContent(noteContent, noteType)}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = new ReadableStream({
    async start(controller) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        stream: true
      })

      for await (const event of response) {
        if (event.type === 'content_block_delta') {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
```

### Frontend Streaming Handler

```javascript
const sendChatMessage = async () => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, noteContent, noteTitle, noteType })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullMessage = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    fullMessage += decoder.decode(value, { stream: true });

    // Update UI with streaming content
    setChatMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: 'assistant', content: fullMessage };
      return updated;
    });
  }
};
```

---

## Data Flow

### Create Note Flow

```
User clicks "New Note"
        │
        ▼
┌─────────────────┐
│  UI Modal Opens │
│  (Form inputs)  │
└────────┬────────┘
         │ Submit
         ▼
┌─────────────────┐
│  api.createNote │
│  (Frontend)     │
└────────┬────────┘
         │ POST /api/notes
         ▼
┌─────────────────┐
│  Route Handler  │
│  (Backend)      │
└────────┬────────┘
         │ INSERT INTO notes
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  (Neon)         │
└────────┬────────┘
         │ RETURNING *
         ▼
┌─────────────────┐
│  Response JSON  │
│  (New Note)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  setNotes()     │
│  (State Update) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UI Re-renders  │
│  (Note visible) │
└─────────────────┘
```

---

## Security Considerations

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
ANTHROPIC_API_KEY=sk-ant-...

# Set in Vercel Dashboard for production
# Set in .env.local for development
```

### API Security Checklist

- [ ] All database queries use parameterized statements (SQL template literals)
- [ ] No sensitive data in client-side code
- [ ] API keys only accessed server-side
- [ ] Input validation on all endpoints
- [ ] Error messages don't expose internal details
- [ ] Rate limiting on AI endpoints (consider adding)
- [ ] CORS configured appropriately

### Database Security

```typescript
// GOOD - Parameterized query (safe from SQL injection)
const rows = await sql`
  SELECT * FROM notes WHERE id = ${noteId}
`

// BAD - String concatenation (vulnerable)
const rows = await sql(`SELECT * FROM notes WHERE id = '${noteId}'`)
```

---

## Deployment Architecture

### Vercel + Neon Setup

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Edge Network                      │    │
│  │         (Global CDN, SSL, DDoS protection)          │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Serverless Functions                    │    │
│  │         (API Routes auto-scaled)                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Environment Variables                     │    │
│  │    DATABASE_URL, ANTHROPIC_API_KEY (encrypted)      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         NEON                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Serverless Postgres Cluster                │    │
│  │     (Auto-scaling, connection pooling, branching)   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Workflow

```bash
# Development
npm run dev          # Start local server
vercel env pull      # Pull production env vars

# Production
git push origin main # Auto-deploys via Vercel
vercel --prod        # Manual production deploy
```

---

## Extension Patterns

### Adding a New Note Type

1. **Add type to TypeScript definitions:**
```typescript
// src/types/index.ts
export interface Note {
  type: 'text' | 'spreadsheet' | 'prompt' | 'book' | 'travel' | 'tiktok' | 'newtype'
}
```

2. **Create editor component:**
```javascript
// In PromptRepository.jsx
const NewTypeEditor = ({ note, onUpdate }) => {
  const [data, setData] = useState(() => JSON.parse(note.content));
  // ... editor logic
};
```

3. **Add to template selector:**
```javascript
const noteTemplates = [
  // ... existing templates
  { id: 'newtype', name: 'New Type', icon: 'IconName', description: '...' }
];
```

4. **Add rendering logic:**
```javascript
{note.type === 'newtype' && <NewTypeEditor note={note} onUpdate={...} />}
```

### Adding a New API Endpoint

```typescript
// src/app/api/newresource/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

function getSQL() {
  return neon(process.env.DATABASE_URL!)
}

export async function GET() {
  const rows = await getSQL()`SELECT * FROM newresource`
  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { field1, field2 } = await request.json()
  const id = Math.random().toString(36).substr(2, 9)
  const rows = await getSQL()`
    INSERT INTO newresource (id, field1, field2)
    VALUES (${id}, ${field1}, ${field2})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
```

### Adding AI Features

```typescript
// Pattern for new AI endpoint
export async function POST(request: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })

  return NextResponse.json({ result: message.content[0].text })
}
```

---

## Quick Reference

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/db/index.ts` | All database operations |
| `src/components/PromptRepository.jsx` | Main UI component |
| `src/types/index.ts` | TypeScript definitions |
| `src/app/api/*/route.ts` | API endpoints |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | For AI | Claude API key |

---

*Last updated: 2026-05-22*
