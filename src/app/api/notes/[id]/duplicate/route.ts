import { NextResponse } from 'next/server'
import { duplicateNote } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { notebookId } = body

    const note = await duplicateNote(auth.id, id, notebookId || undefined)
    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error duplicating note:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate note' },
      { status: 500 }
    )
  }
}
