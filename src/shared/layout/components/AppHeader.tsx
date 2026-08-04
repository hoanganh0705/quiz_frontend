'use client'

import { useMemo, useEffect, useState, useSyncExternalStore } from 'react'
import { ChevronDown, LogOut, Search, Settings, User as UserIcon, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { ModeToggle } from '@/shared/layout/components/ModeToggle'
import { SidebarTrigger, useSidebar } from '@/components/ui/Sidebar'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { useIsMobile, useAsyncAction } from '@/shared/hooks'
import { useAppLanguage } from '@/shared/hooks/use-app-language'
import { useAuthState } from '@/features/auth/hooks'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
// TKT-2.2.E1: migrated off the deprecated `features/auth/api/auth`
// barrel. `logout` is the same side-effecting wrapper Epic 2.1
// landed on `auth.service.ts` (cookie + cross-tab broadcast).
import { logout } from '@/features/auth/service/auth.service'
import { useRouter } from 'next/navigation'
import { useUser, useClearUser } from '@/features/users/store/user-store'
import { getUnreadCount } from '@/features/notifications/api'

// Detect Mac only on the client (navigator is undefined on the server).
// useSyncExternalStore keeps the server snapshot stable and avoids hydration mismatches.
function useIsMac() {
  return useSyncExternalStore(
    () => () => {},
    () => /Mac|iPod|iPhone|iPad/.test(navigator.platform),
    () => false
  )
}

function MessagesButton() {
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    async function fetchUnreadCount() {
      try {
        const { unreadCount: count } = await getUnreadCount()
        if (!cancelled) {
          setUnreadCount(count)
        }
      } catch {
        // API unavailable — keep 0
      }
    }

    void fetchUnreadCount()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <button
      className='relative'
      aria-label={
        unreadCount > 0 ? `Messages (${unreadCount} unread)` : 'Messages'
      }
      type='button'
      onClick={() => router.push('/messages')}
    >
      <div className='p-1.5 sm:p-2 border border-border rounded-md hover:bg-main-hover transition-colors'>
        <MessageSquare className='h-4 w-4 text-foreground' />
      </div>
      {unreadCount > 0 && (
        <div className='absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full dark:bg-white bg-red-600 text-[0.6rem] flex items-center justify-center text-white dark:text-black'>
          <span className='text-center leading-none' aria-hidden='true'>
            {unreadCount}
          </span>
        </div>
      )}
    </button>
  )
}

export function AppHeader() {
  const { state } = useSidebar()
  const isMobile = useIsMobile()
  const { t } = useAppLanguage()
  const { isAuthenticated, setAuthenticated } = useAuthState()
  const router = useRouter()
  const user = useUser()
  const clearUser = useClearUser()
  const isMac = useIsMac()

  const avatarLabel = useMemo(() => {
    const value = user?.displayName || user?.username || user?.email || 'User'
    const parts = value.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }, [user])

  const userDisplayName = useMemo(() => {
    return user?.displayName || user?.username || user?.email || 'Account'
  }, [user])

  const userEmail = user?.email
  const userAvatarUrl = user?.avatarUrl

  const { execute: handleLogout, isLoading: isLoggingOut } = useAsyncAction(
    async () => {
      try {
        await logout()
      } finally {
        setAuthenticated(false)
        clearUser()
        router.replace('/login')
      }
    }
  )

  const sidebarWidth =
    isMobile === undefined
      ? '0'
      : isMobile
        ? '0'
        : state === 'expanded'
          ? '16rem'
          : '3rem'

  // Auth state is undefined until after mount (useAuthState uses useState(undefined)).
  // Return a matching placeholder to avoid hydration mismatch and prevent layout shift.
  if (isAuthenticated === undefined) {
    return (
      <header
        className='fixed top-0 z-50 h-16 flex items-center
                   bg-background border-b border-border px-2 sm:px-4
                   transition-all duration-300'
        style={{ left: sidebarWidth, right: 0 }}
        aria-hidden='true'
      />
    )
  }

  return (
    <header
      className='fixed top-0 z-50 h-16 flex items-center
                 bg-background border-b border-border px-2 sm:px-4
                 transition-all duration-300'
      style={{ left: sidebarWidth, right: 0 }}
    >
      <div>
        <SidebarTrigger
          className='text-foreground/70 hover:text-foreground  hover:bg-transparent bg-transparent font-extralight'
          aria-label='Toggle sidebar'
        />
      </div>

      <div className='w-4 sm:w-4' />

      <div className='hidden sm:flex items-center gap-2 flex-1 min-w-0 max-w-sm sm:max-w-md lg:max-w-xl'>
        <div className='relative flex-1 min-w-0'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60 h-4 w-4' />
          <Input
            type='search'
            placeholder={t(
              'searchPlaceholder',
              'Search quizzes, categories, creators...'
            )}
            className='pl-10 pr-16 bg-background border border-border text-foreground placeholder-muted-foreground w-full text-sm focus:border-ring'
            onFocus={(e) => {
              e.target.blur()
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true })
              )
            }}
            readOnly
          />
          <kbd className='absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/50'>
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </div>
      </div>

      <div className='w-4 sm:w-4 flex-1' />

      <div className='flex items-center gap-2 sm:gap-2 md:gap-3 shrink-0'>
        <MessagesButton />
        <NotificationBell />
        <div>
          <ModeToggle />
        </div>

        <div className='hidden sm:flex items-center gap-1 p-1 sm:p-2 border border-border rounded-lg'>
          <span className='text-foreground text-xs sm:text-sm font-medium'>
            ${user?.balance != null ? user.balance.toFixed(2) : '124.50'}
          </span>
          <span className='text-green-500 text-xs sm:text-sm font-medium'>
            💰
          </span>
        </div>

        {isAuthenticated ? (
          <div className='relative z-55'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-muted/70'
                aria-label='Open user menu'
              >
                <Avatar className='h-7 w-7 sm:h-8 sm:w-8 shrink-0'>
                  {userAvatarUrl ? (
                    <AvatarImage src={userAvatarUrl} alt={userDisplayName} />
                  ) : null}
                  <AvatarFallback className='bg-brand text-white-primary text-xs'>
                    {avatarLabel}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className='h-3.5 w-3.5 text-foreground/60' />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align='end'
              sideOffset={12}
              className='w-64 z-60'
            >
              <DropdownMenuLabel className='space-y-1'>
                <div className='flex items-center gap-3'>
                  <Avatar className='h-9 w-9 shrink-0'>
                    {userAvatarUrl ? (
                      <AvatarImage src={userAvatarUrl} alt={userDisplayName} />
                    ) : null}
                    <AvatarFallback className='bg-brand text-white-primary text-xs'>
                      {avatarLabel}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-foreground'>
                      {userDisplayName}
                    </p>
                    {userEmail ? (
                      <p className='truncate text-xs text-muted-foreground'>
                        {userEmail}
                      </p>
                    ) : null}
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href='/my-profile' className='flex items-center gap-2'>
                  <UserIcon className='h-4 w-4' />
                  <span>My profile</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href='/settings' className='flex items-center gap-2'>
                  <Settings className='h-4 w-4' />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant='destructive'
                className='flex items-center gap-2'
                onSelect={(event) => {
                  event.preventDefault()
                  void handleLogout()
                }}
                disabled={isLoggingOut}
              >
                <LogOut className='h-4 w-4' />
                <span>{isLoggingOut ? 'Signing out…' : 'Logout'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        ) : (
          <Button asChild size='sm' className='rounded-full px-4'>
            <Link href='/login'>Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
