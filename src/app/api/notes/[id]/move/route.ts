import { NextResponse } from 'next/server'
import { moveNote } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { id } = await params
    const { notebookId } = await request.json()

    if (!notebookId) {
      return NextResponse.json(
        { error: 'notebookId is required' },
        { status: 400 }
      )
    }

    const note = await moveNote(auth.id, id, notebookId)
    return NextResponse.json(note)
  } catch (error) {
    console.error('Error moving note:', error)
    return NextResponse.json(
      { error: 'Failed to move note' },
      { status: 500 }
    )
  }
}
