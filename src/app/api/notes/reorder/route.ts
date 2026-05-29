import { NextResponse } from 'next/server'
import { reorderNotes } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function PUT(request: Request) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { notebookId, noteIds } = await request.json()

    if (!notebookId || !noteIds || !Array.isArray(noteIds)) {
      return NextResponse.json(
        { error: 'notebookId and noteIds array are required' },
        { status: 400 }
      )
    }

    await reorderNotes(auth.id, notebookId, noteIds)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering notes:', error)
    return NextResponse.json(
      { error: 'Failed to reorder notes' },
      { status: 500 }
    )
  }
}
