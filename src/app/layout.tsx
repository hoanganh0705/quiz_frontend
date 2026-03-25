import type React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { LayoutShell } from '@/components/LayoutShell'
import { PwaServiceWorker } from '@/components/PwaServiceWorker'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800']
})

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
