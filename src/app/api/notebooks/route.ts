import { NextResponse } from 'next/server'
import { getNotebooks, createNotebook } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const notebooks = await getNotebooks(auth.id)
    return NextResponse.json(notebooks)
  } catch (error) {
    console.error('Error fetching notebooks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notebooks' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const notebook = await createNotebook(auth.id, name, description || null)
    return NextResponse.json(notebook, { status: 201 })
  } catch (error) {
    console.error('Error creating notebook:', error)
    return NextResponse.json(
      { error: 'Failed to create notebook' },
      { status: 500 }
    )
  }
}
