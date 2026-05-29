import { NextResponse } from 'next/server'
import { updateNotebook, deleteNotebook } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { id } = await params
    const body = await request.json()
    const { name, description, icon, iconColor } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const notebook = await updateNotebook(auth.id, id, name, description, icon, iconColor)
    return NextResponse.json(notebook)
  } catch (error) {
    console.error('Error updating notebook:', error)
    return NextResponse.json(
      { error: 'Failed to update notebook' },
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
    await deleteNotebook(auth.id, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notebook:', error)
    return NextResponse.json(
      { error: 'Failed to delete notebook' },
      { status: 500 }
    )
  }
}
