import { NextResponse } from 'next/server'
import { updateNote, deleteNote } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { id } = await params
    const { title, content, tags } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const note = await updateNote(auth.id, id, title, content || '', tags)
    return NextResponse.json(note)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { id } = await params
    await deleteNote(auth.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}
