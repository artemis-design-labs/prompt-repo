import { NextResponse } from 'next/server'
import { getPrompts, createPrompt } from '@/lib/db'
import { requireUser, isAuthResponse } from '@/lib/auth'

export async function GET() {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const prompts = await getPrompts(auth.id)
    return NextResponse.json(prompts)
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (isAuthResponse(auth)) return auth

    const { title, content, folderId, tags } = await request.json()

    if (!title || !content || !folderId) {
      return NextResponse.json(
        { error: 'Title, content, and folderId are required' },
        { status: 400 }
      )
    }

    const prompt = await createPrompt(auth.id, title, content, folderId, tags || [])
    return NextResponse.json(prompt, { status: 201 })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    )
  }
}
