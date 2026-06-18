import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prompt Repository',
  description: 'Organize and manage your AI prompts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-r-bg text-r-text">
        {children}
      </body>
    </html>
  )
}
