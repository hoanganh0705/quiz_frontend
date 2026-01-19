'use client'

import type React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ToastContainer } from 'react-toastify'
import { usePathname } from 'next/navigation'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800']
})

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthPage =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/forgot-password')

  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased bg-slate-900 text-white overflow-x-hidden`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          {isAuthPage ? (
            <>
              {children}
              <ToastContainer
                position='top-right'
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
            </>
          ) : (
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className='overflow-x-hidden'>
                <AppHeader />
                <main className='pt-16 overflow-x-hidden max-w-full'>
                  {children}
                </main>
              </SidebarInset>
              <ToastContainer
                position='top-right'
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
            </SidebarProvider>
          )}
        </ThemeProvider>
      </body>
    </html>
  )
}
