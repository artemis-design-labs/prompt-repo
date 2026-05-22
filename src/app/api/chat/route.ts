import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  noteContent: string
  noteTitle: string
  noteType: 'text' | 'spreadsheet' | 'prompt'
}

// Format spreadsheet JSON content to readable markdown
function formatSpreadsheetContent(content: string): string {
  try {
    const data = JSON.parse(content)
    if (!data.tables || !Array.isArray(data.tables)) {
      return content
    }

    return data.tables.map((table: { name: string; columns: string[]; rows: string[][] }) => {
      const header = `### ${table.name || 'Table'}\n`
      const columns = table.columns || []
      const rows = table.rows || []

      if (columns.length === 0) return header + '(Empty table)'

      const headerRow = '| ' + columns.join(' | ') + ' |'
      const separator = '| ' + columns.map(() => '---').join(' | ') + ' |'
      const dataRows = rows.map((row: string[]) => '| ' + row.join(' | ') + ' |').join('\n')

      return `${header}${headerRow}\n${separator}\n${dataRows}`
    }).join('\n\n')
  } catch {
    return content
  }
}

// Format note content based on type
function formatNoteContent(content: string, noteType: string): string {
  if (noteType === 'spreadsheet') {
    return formatSpreadsheetContent(content)
  }
  return content
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body: ChatRequest = await request.json()
    const { messages, noteContent, noteTitle, noteType } = body

    if (!messages || !noteContent) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const formattedContent = formatNoteContent(noteContent, noteType)

    const systemPrompt = `You are a helpful AI assistant analyzing and answering questions about a note.

Note Title: ${noteTitle}
Note Type: ${noteType}

Note Content:
${formattedContent}

Help the user understand, analyze, or work with this note's content. Be concise and helpful. If the user asks about something not in the note, let them know it's not covered in the current note.`

    const anthropic = new Anthropic({ apiKey })

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: anthropicMessages,
            stream: true
          })

          for await (const event of response) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(new TextEncoder().encode(event.delta.text))
            }
          }
          controller.close()
        } catch (error) {
          console.error('Anthropic API error:', error)
          controller.enqueue(new TextEncoder().encode('Sorry, I encountered an error processing your request.'))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
