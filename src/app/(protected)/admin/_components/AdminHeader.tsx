'use client'

import type React from 'react'
import { Bell, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { ModeToggle } from '@/shared/layout/components/ModeToggle'
import { SidebarTrigger, useSidebar } from '@/components/ui/Sidebar'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { AdminBreadcrumb } from '@/features/admin/components/AdminBreadcrumb'

export function AdminHeader() {
  const { state } = useSidebar()
  const isMobile = useIsMobile()
  const { logout } = useLogout()

  const sidebarWidth =
    isMobile === undefined
      ? '0'
      : isMobile
        ? '0'
        : state === 'expanded'
          ? '16rem'
          : '3rem'

  return (
    <header
      className='fixed top-0 z-50 flex h-14 items-center
                 bg-background border-b border-border px-4
                 transition-all duration-300 gap-4'
      style={{ left: sidebarWidth, right: 0 }}
    >
      <SidebarTrigger
        className='text-foreground/70 hover:text-foreground hover:bg-transparent bg-transparent shrink-0'
        aria-label='Toggle sidebar'
      />
      {/* Breadcrumb landmark — primary navigation orientation */}
      <div className='flex-1 min-w-0'>
        <AdminBreadcrumb />
      </div>

      {/* Header-right cluster */}
      <div className='flex items-center gap-2 shrink-0'>
        <Button
          variant='ghost'
          size='icon'
          className='relative text-foreground/70 hover:text-foreground hover:bg-accent'
          aria-label='Notifications'
        >
          <Bell className='h-4 w-4' />
          <span className='absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive' />
        </Button>

        <ModeToggle />

        <div className='h-6 w-px bg-border mx-1' />

        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-foreground'>Admin</span>
        </div>

        <Button
          variant='ghost'
          size='icon'
          className='text-foreground/70 hover:text-foreground hover:bg-accent'
          aria-label='Sign out'
          onClick={() => logout()}
        >
          <LogOut className='h-4 w-4' />
        </Button>
      </div>
    </header>
  )
}
