'use client'

import type React from 'react'
import { AppSidebar } from '@/components/AppSidebar'
import { AppHeader } from '@/components/AppHeader'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { usePathname } from 'next/navigation'
import { QuickSearch } from '@/components/keyboard-shortcuts/QuickSearch'
import { ShortcutsHelpModal } from '@/components/keyboard-shortcuts/ShortcutsHelpModal'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/forgot-password')
  const isOnboardingPage = pathname?.startsWith('/onboarding')

  if (isAuthPage || isOnboardingPage) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className='overflow-x-hidden'>
        <AppHeader />
        <main className='pt-16 overflow-x-hidden max-w-full'>{children}</main>
      </SidebarInset>

      {/* Global keyboard shortcut modals */}
      <QuickSearch />
      <ShortcutsHelpModal />
    </SidebarProvider>
  )
}
