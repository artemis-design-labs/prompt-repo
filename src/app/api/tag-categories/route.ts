import { NextResponse } from 'next/server'
import { getTagCategories, createTagCategory } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const categories = await getTagCategories(auth.id)
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching tag categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tag categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { name, tags } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    const category = await createTagCategory(auth.id, name, tags || [])
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating tag category:', error)
    return NextResponse.json(
      { error: 'Failed to create tag category' },
      { status: 500 }
    )
  }
}
