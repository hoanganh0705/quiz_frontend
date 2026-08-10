import type React from 'react'
import type { Metadata } from 'next'
import { inter } from '@/shared/config/fonts'
import { SwrProvider, ThemeProvider } from '@/providers'
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
      <body
        className={`${inter.className} antialiased overflow-x-hidden`}
        suppressHydrationWarning
      >
        <a href='#main-content' className='skip-link'>
          Skip to main content
        </a>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <SwrProvider>
            <PwaServiceWorker />
            <LayoutShell>{children}</LayoutShell>
          </SwrProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
