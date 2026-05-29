import { NextResponse } from 'next/server'
import { getFolders, createFolder } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const folders = await getFolders(auth.id)
    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { name, parentId } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const folder = await createFolder(auth.id, name, parentId || null)
    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}
