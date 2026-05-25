'use client'

import type React from 'react'
import { useEffect } from 'react'
import { AppSidebar } from '@/shared/layout/components/AppSidebar'
import { AppHeader } from '@/shared/layout/components/AppHeader'
import { SidebarInset, SidebarProvider } from '@/components/ui/Sidebar'
import { usePathname, useRouter } from 'next/navigation'
import { QuickSearch } from '@/shared/ui'
import { ShortcutsHelpModal } from '@/shared/ui'
import { AppBreadcrumbs } from '@/shared/layout/components/AppBreadcrumbs'
import { useAuthState } from '@/features/auth/hooks'
import { useUser, useIsUserLoading, useFetchCurrentUser, useUserStore } from '@/features/users/store/user-store'

// Pages that render inside the full sidebar + header shell
const SHELL_PREFIXES = [
  '/bookmarks',
  '/categories',
  '/create-quiz',
  '/daily-challenge',
  '/discussions',
  '/friends',
  '/leaderboard',
  '/my-profile',
  '/onboarding',
  '/profile',
  '/quiz-history',
  '/quizzes',
  '/settings',
  '/support',
  '/tournament'
] as const

// Pages that show no shell at all (full-page auth screens)
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/resend-verification', '/verify-email'] as const

function isShellPage(pathname: string | undefined): boolean {
  if (!pathname) return true
  return SHELL_PREFIXES.some((p) => pathname.startsWith(p))
}

function isAuthPage(pathname: string | undefined): boolean {
  if (!pathname) return false
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p))
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated } = useAuthState()
  const user = useUser()
  const isUserLoading = useIsUserLoading()
  const fetchCurrentUser = useFetchCurrentUser()

  // Rehydrate persist store from localStorage on client mount.
  useEffect(() => {
    useUserStore.persist.rehydrate()
  }, [])

  // Fetch user profile once authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    if (user || isUserLoading) return
    fetchCurrentUser()
  }, [fetchCurrentUser, isAuthenticated, isUserLoading, user])

  // Client-side fallback guard: if we somehow reach a protected page without auth
  // (e.g. page loaded before middleware ran), redirect immediately.
  useEffect(() => {
    const protectedPrefixes = [
      '/bookmarks',
      '/settings',
      '/my-profile',
      '/quiz-history',
      '/friends',
      '/discussions',
      '/tournament',
      '/create-quiz',
      '/onboarding'
    ]
    const isProtected = protectedPrefixes.some((p) => pathname?.startsWith(p))
    if (isProtected && isAuthenticated === false) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname ?? '/')}`)
    }
  }, [isAuthenticated, pathname, router])

  // Auth pages render without the shell
  if (isAuthPage(pathname)) {
    return <>{children}</>
  }

  // Non-shell pages (e.g. standalone marketing pages) also skip the shell
  if (!isShellPage(pathname)) {
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
          {children}
        </main>
      </SidebarInset>

      <QuickSearch />
      <ShortcutsHelpModal />
    </SidebarProvider>
  )
}
