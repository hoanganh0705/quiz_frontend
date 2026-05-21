'use client'

import type React from 'react'
import { Search, Bell, LogOut } from 'lucide-react'
import Link from 'next/link'

import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ModeToggle } from '@/shared/layout/components/ModeToggle'
import { SidebarTrigger, useSidebar } from '@/components/ui/Sidebar'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { useLogout } from '@/features/auth/hooks/use-logout'

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
      className='fixed top-0 z-50 h-14 flex items-center
                 bg-background border-b border-border px-4
                 transition-all duration-300'
      style={{ left: sidebarWidth, right: 0 }}
    >
      <SidebarTrigger
        className='text-foreground/70 hover:text-foreground hover:bg-transparent bg-transparent'
        aria-label='Toggle sidebar'
      />

      <div className='flex-1 max-w-md mx-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4' />
          <Input
            type='search'
            placeholder='Search anything...'
            className='pl-10 bg-muted/40 border-border text-foreground placeholder-muted-foreground w-full text-sm focus:border-ring'
          />
        </div>
      </div>

      <div className='flex items-center gap-2 ml-auto'>
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
