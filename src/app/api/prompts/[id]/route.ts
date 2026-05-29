import { NextResponse } from 'next/server'
import { updatePrompt, deletePrompt } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { id } = await params
    const { title, content, folderId, tags } = await request.json()

    if (!title || !content || !folderId) {
      return NextResponse.json(
        { error: 'Title, content, and folderId are required' },
        { status: 400 }
      )
    }

    const prompt = await updatePrompt(auth.id, id, title, content, folderId, tags || [])
    return NextResponse.json(prompt)
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to update prompt' },
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
    await deletePrompt(auth.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    )
  }
}
