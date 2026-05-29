import { NextResponse } from 'next/server'
import { getTags, createTag, deleteTag } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const tags = await getTags(auth.id)
    return NextResponse.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const tag = await createTag(auth.id, name)
    return NextResponse.json({ name: tag }, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    await deleteTag(auth.id, name)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}
