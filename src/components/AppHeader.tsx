'use client'

import { Search, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ModeToggle } from '@/components/ModeToggle'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { useEffect, useState } from 'react'

export function AppHeader() {
  const { state } = useSidebar()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sidebarWidth = isMobile ? '0' : state === 'expanded' ? '16rem' : '3rem'

  return (
    <header
      className='fixed top-0 z-50 h-16 flex items-center
                 bg-background border-b border-gray-300 dark:border-slate-700 px-2 sm:px-4
                 transition-all duration-300'
      style={{ left: sidebarWidth, right: 0 }}
    >
      {/* Left Section: SidebarTrigger */}
      <div>
        <SidebarTrigger
          className='text-foreground/70 hover:text-foreground  hover:bg-transparent bg-transparent font-extralight'
          aria-label='Toggle sidebar'
        />
      </div>

      {/* Gap between Left and Middle/Right sections */}
      <div className='w-4 sm:w-4' />

      {/* Middle Section: Search */}
      <div className='hidden sm:flex items-center gap-2 flex-1 min-w-0 max-w-sm sm:max-w-md lg:max-w-xl'>
        <div className='relative flex-1 min-w-0'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-[#020817]/60 dark:text-slate-400 h-4 w-4' />
          <Input
            type='search'
            placeholder='Search quizzes, categories, creators...'
            className='pl-10 bg-background border border-gray-300 dark:border-slate-700 text-foreground placeholder-[#020817] dark:placeholder-slate-400 w-full text-sm focus:border-slate-600'
          />
        </div>
      </div>

      {/* Gap */}
      <div className='w-4 sm:w-4 flex-1' />

      {/* Right Section */}
      <div className='flex items-center gap-2 sm:gap-2 md:gap-3 shrink-0'>
        {/* Messages */}
        <button
          className='relative'
          aria-label='Messages (2 unread)'
          type='button'
        >
          <div className='p-1.5 sm:p-2 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-main-hover transition-colors'>
            <MessageSquare className='h-4 w-4 text-foreground' />
          </div>
          <div className='absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full dark:bg-white bg-red-600 text-[0.6rem] flex items-center justify-center text-white dark:text-black'>
            <span className='text-center leading-none' aria-hidden='true'>
              2
            </span>
          </div>
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Theme Toggle */}
        <div>
          <ModeToggle />
        </div>

        {/* Wallet */}
        <div className='hidden sm:flex items-center gap-1 p-1 sm:p-2 border border-gray-300 dark:border-slate-700 rounded-lg'>
          <span className='text-foreground text-xs sm:text-sm font-medium'>
            $124.50
          </span>
          <span className='text-green-500 text-xs sm:text-sm font-medium'>
            💰
          </span>
        </div>

        {/* Avatar */}
        <Avatar className='h-7 w-7 sm:h-8 sm:w-8 shrink-0'>
          <AvatarImage src='/avatarPlaceholder.webp' />
          <AvatarFallback className='bg-background text-background text-xs'>
            JD
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
