'use client'

import type React from 'react'
import { useEffect } from 'react'
import { AppSidebar } from '@/features/layout/components/AppSidebar'
import { AppHeader } from '@/features/layout/components/AppHeader'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { usePathname } from 'next/navigation'
import { QuickSearch } from '@/shared/ui'
import { ShortcutsHelpModal } from '@/shared/ui'
import { AppBreadcrumbs } from '@/features/layout/components/AppBreadcrumbs'
import { GuestAccessBanner } from '@/features/auth/components/GuestAccessBanner'
import { useAuthState } from '@/features/auth/hooks'
import { useUser, useUserActions, useUserStatus } from '@/features/users/store/user-store'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthState()
  const user = useUser()
  const { isLoading: isUserLoading } = useUserStatus()
  const { fetchCurrentUser } = useUserActions()
  const isAuthPage =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/signup') ||
    pathname?.startsWith('/forgot-password')
  const isOnboardingPage = pathname?.startsWith('/onboarding')
  const protectedPrefixes = [
    '/create-quiz',
    '/settings',
    '/bookmarks',
    '/my-profile',
    '/quiz-history',
    '/friends',
    '/discussions',
    '/tournament'
  ]
  const isProtectedPage = protectedPrefixes.some((prefix) =>
    pathname?.startsWith(prefix)
  )

  useEffect(() => {
    if (!isAuthenticated) return
    if (user || isUserLoading) return
    fetchCurrentUser()
  }, [fetchCurrentUser, isAuthenticated, isUserLoading, user])

  if (isAuthPage || isOnboardingPage) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className='overflow-x-hidden'>
        <AppHeader />
        <AppBreadcrumbs />
        <main
          id='main-content'
          className='pt-3 overflow-x-hidden max-w-full app-page-transition'
        >
          {isProtectedPage && !isAuthenticated && (
            <div className='px-4 pt-2'>
              <GuestAccessBanner />
            </div>
          )}
          {children}
        </main>
      </SidebarInset>

      <QuickSearch />
      <ShortcutsHelpModal />
    </SidebarProvider>
  )
}
