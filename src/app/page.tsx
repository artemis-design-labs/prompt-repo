'use client'

import PromptRepository from '@/components/PromptRepository'
import AuthGate from '@/components/AuthGate'

export default function Home() {
  return (
    <AuthGate>
      <PromptRepository />
    </AuthGate>
  )
}
