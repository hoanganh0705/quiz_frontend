import type React from 'react'
import type { Metadata } from 'next'
import { inter } from '@/shared/config/fonts'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { LayoutShell } from '@/shared/layout'
import { PwaServiceWorker } from '@/shared/ui/PwaServiceWorker'
import './globals.css'

export const metadata: Metadata = {
  title: 'QuizHub - Play, Share, Earn!',
  description:
    'Build engaging quizzes, challenge others, and earn rewards for your knowledge.'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={`${inter.className} antialiased overflow-x-hidden`}>
        <a href='#main-content' className='skip-link'>
          Skip to main content
        </a>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <PwaServiceWorker />
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
